import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

const analysisSchema = {
    type: SchemaType.OBJECT,
    properties: {
        overallScore: {
            type: SchemaType.INTEGER,
            description: "Overall resume score out of 100 based on all factors",
        },
        grade: {
            type: SchemaType.STRING,
            description: "A letter grade like A, B, C, D, or F",
        },
        scores: {
            type: SchemaType.OBJECT,
            properties: {
                ats: { type: SchemaType.INTEGER, description: "ATS compatibility score out of 100" },
                content: { type: SchemaType.INTEGER, description: "Quality of content and impact score out of 100" },
                alignment: { type: SchemaType.INTEGER, description: "Alignment with job description (if provided) or industry standards out of 100" },
                format: { type: SchemaType.INTEGER, description: "Formatting and readability score out of 100" },
                language: { type: SchemaType.INTEGER, description: "Grammar, tone, and action verbs score out of 100" }
            },
            required: ["ats", "content", "alignment", "format", "language"]
        },
        missingKeywords: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "List of missing crucial keywords or skills based on the job description or industry best practices."
        },
        suggestions: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    section: { type: SchemaType.STRING, description: "The section of the resume (e.g., 'Work Experience', 'Skills', 'Summary')" },
                    original: { type: SchemaType.STRING, description: "A verbatim snippet of the original weak bullet point or sentence" },
                    improved: { type: SchemaType.STRING, description: "An AI-rewritten, much stronger version of the original snippet" },
                    reason: { type: SchemaType.STRING, description: "Brief explanation of why the improved version is better" }
                },
                required: ["section", "original", "improved", "reason"]
            },
            description: "Actionable suggestions for improving specific sentences or bullet points in the resume."
        },
        summary: {
            type: SchemaType.OBJECT,
            properties: {
                strengths: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                    description: "List of the strongest positive points about the resume."
                },
                improvements: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                    description: "High-level summary of what needs the most improvement."
                }
            },
            required: ["strengths", "improvements"]
        }
    },
    required: ["overallScore", "grade", "scores", "missingKeywords", "suggestions", "summary"]
};

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
    }
});

export const requestResumeAnalysis = async (resumeText, jobDescription = "") => {
    let prompt = `
    You are an expert technical recruiter and ATS software evaluator.
    I will provide you with the extracted text from a candidate's resume.
    `;

    if (jobDescription) {
        prompt += `I will also provide a Job Description that the candidate is applying for.\n`;
    } else {
        prompt += `Evaluate this resume against general industry best practices as no specific job description was provided.\n`;
    }

    prompt += `
    Your task is to thoroughly analyze the resume and provide a detailed review in JSON format matching the schema strictly.
    Critique it rigorously like a hiring manager at a top tech company. Evaluate the impact of bullet points (did they use data/metrics?), the presence of action-oriented verbs, readability, and overall ATS parseability.

    Resume Text:
    """
    ${resumeText}
    """
    `;

    if (jobDescription) {
        prompt += `
    Job Description:
    """
    ${jobDescription}
    """
    `;
    }

    let retries = 3;
    while (retries > 0) {
        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            return JSON.parse(responseText);
        } catch (error) {
            console.error(`Gemini API Error (${retries} retries left):`, error);
            retries--;
            if (retries === 0) {
                throw new Error(error.message?.includes('503')
                    ? "Google AI services are temporarily unavailable. Please try again in a few moments."
                    : "Failed to analyze resume with AI.");
            }
            // Wait for 2 seconds before retrying
            await new Promise(res => setTimeout(res, 2000));
        }
    }
};
