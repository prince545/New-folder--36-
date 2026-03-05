import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const checkDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB Atlas.");

        const Resume = mongoose.connection.collection('resumes');
        const Analysis = mongoose.connection.collection('analyses');

        const resumeCount = await Resume.countDocuments();
        const analysisCount = await Analysis.countDocuments();

        console.log(`Resumes in DB: ${resumeCount}`);
        console.log(`Analyses in DB: ${analysisCount}`);

        const latestResume = await Resume.find().sort({ createdAt: -1 }).limit(1).toArray();
        if (latestResume.length > 0) {
            console.log("Latest Resume:", latestResume[0]._id, latestResume[0].originalFileName, "| Has Analyses Array?", !!latestResume[0].analyses);
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

checkDB();
