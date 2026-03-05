import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import WelcomeBanner from "../components/dashboard/WelcomeBanner";
import QuickActionCards from "../components/dashboard/QuickActionCards";
import StatsRow from "../components/dashboard/StatsRow";
import RecentActivityList from "../components/dashboard/RecentActivityList";

export default function DashboardPage() {
    const { getToken, userId } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchHistory() {
            if (!userId) return;

            try {
                const token = await getToken();
                // Fallback or explicit headers according to existing API setup
                const headers = {
                    "x-user-id": userId,
                };
                if (token) headers.Authorization = `Bearer ${token}`;

                const apiUrl = import.meta.env.VITE_BACKEND_URL;
                const res = await fetch(`${apiUrl}/api/resume/all`, { headers });
                if (!res.ok) throw new Error("Failed to fetch history");

                const resumes = await res.json();
                setData(resumes);
            } catch (err) {
                toast.error("Could not load dashboard data.");
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, [getToken, userId]);

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <WelcomeBanner />
            <StatsRow data={data} />
            <QuickActionCards />
            <RecentActivityList data={data} loading={loading} />
        </div>
    );
}
