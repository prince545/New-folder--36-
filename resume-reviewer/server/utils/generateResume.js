import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// ─── Resume Generation ─────────────────────────────────────────────────────────

const resumeSchema = {
    type: SchemaType.OBJECT,
    properties: {
        name: { type: SchemaType.STRING },
        email: { type: SchemaType.STRING },
        phone: { type: SchemaType.STRING },
        location: { type: SchemaType.STRING },
        linkedin: { type: SchemaType.STRING },
        summary: { type: SchemaType.STRING, description: 'A 2-3 sentence ATS-optimized professional summary' },
        skills: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: 'List of relevant technical and soft skills, ordered by importance'
        },
        experience: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    role: { type: SchemaType.STRING },
                    company: { type: SchemaType.STRING },
                    duration: { type: SchemaType.STRING },
                    bullets: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                        description: 'Strong bullet points with impact metrics and action verbs'
                    }
                },
                required: ['role', 'company', 'duration', 'bullets']
            }
        },
        education: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    degree: { type: SchemaType.STRING },
                    institution: { type: SchemaType.STRING },
                    year: { type: SchemaType.STRING }
                },
                required: ['degree', 'institution', 'year']
            }
        },
        projects: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    name: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                    tech: { type: SchemaType.STRING }
                },
                required: ['name', 'description', 'tech']
            }
        }
    },
    required: ['name', 'email', 'summary', 'skills', 'experience', 'education']
};

const resumeModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: resumeSchema,
    }
});

export const generateResume = async (userInput) => {
    const {
        name, email, phone, location, linkedin,
        jobDescription, experience, education, skills, projects
    } = userInput;

    const prompt = `
You are an expert resume writer and ATS specialist. 
Create a highly professional, ATS-optimized resume JSON using the candidate's raw input below.

Rules:
- Rewrite experience bullets using strong action verbs and add measurable impact wherever implied (use reasonable estimates if not provided)
- Tailor the professional summary and skills tightly to the job description
- Include only the most relevant and impactful content
- Ensure keywords from the job description appear naturally throughout

Candidate's Information:
Name: ${name}
Email: ${email}
Phone: ${phone || 'N/A'}
Location: ${location || 'N/A'}
LinkedIn: ${linkedin || 'N/A'}

Job Description / Target Role:
"""
${jobDescription}
"""

Raw Experience:
"""
${experience}
"""

Education:
"""
${education}
"""

Skills:
"""
${skills}
"""

Projects (if any):
"""
${projects || 'None'}
"""

Return the optimized resume as JSON.
`;

    try {
        const result = await resumeModel.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (error) {
        console.error('Gemini Resume Generation Error:', error);
        throw new Error('Failed to generate resume with AI.');
    }
};

// ─── Cover Letter Generation ───────────────────────────────────────────────────

export const generateCoverLetter = async (resumeData, jobDescription) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
You are an expert career coach. Write a compelling, professional cover letter for the following candidate.

Candidate Name: ${resumeData.name}
Target Role / Job Description:
"""
${jobDescription}
"""

Candidate's Key Qualifications (from resume):
- Summary: ${resumeData.summary}
- Top Skills: ${(resumeData.skills || []).slice(0, 8).join(', ')}
- Most Recent Role: ${resumeData.experience?.[0]?.role} at ${resumeData.experience?.[0]?.company}

Requirements:
- 3 paragraphs: opening hook, proof of value with 2-3 specific achievements, closing call to action
- Professional yet confident tone
- Naturally weave in keywords from the job description
- Addressed "Dear Hiring Manager," and signed with the candidate's name
- Do NOT use generic filler phrases
- Return ONLY the cover letter text, no extra commentary
`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error('Gemini Cover Letter Error:', error);
        throw new Error('Failed to generate cover letter.');
    }
};
