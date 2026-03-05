import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import PageHeader from "../components/shared/PageHeader";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import ConfirmModal from "../components/shared/ConfirmModal";

import HistoryCard from "../components/history/HistoryCard";
import HistoryFilterBar from "../components/history/HistoryFilterBar";
import EmptyHistoryState from "../components/history/EmptyHistoryState";
import PaginationControls from "../components/history/PaginationControls";

const ITEMS_PER_PAGE = 10;

export default function HistoryPage() {
    const { getToken, userId } = useAuth();
    const navigate = useNavigate();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filtering & Pagination state
    const [filter, setFilter] = useState("all"); // 'all' | 'reviewed'
    const [sortOrder, setSortOrder] = useState("desc"); // 'asc' | 'desc'
    const [currentPage, setCurrentPage] = useState(1);

    // Deletion modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        async function fetchHistory() {
            if (!userId) return;
            try {
                const token = await getToken();
                const apiUrl = import.meta.env.VITE_BACKEND_URL;
                const res = await fetch(`${apiUrl}/api/resume/all`, {
                    headers: {
                        "x-user-id": userId,
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                    }
                });
                if (!res.ok) throw new Error("Failed to fetch history");
                const resumes = await res.json();
                setData(resumes);
            } catch (err) {
                toast.error("Could not load your history.");
            } finally {
                setLoading(false);
            }
        }
        fetchHistory();
    }, [getToken, userId]);

    // Derived state: Filtered & Sorted
    const processedData = useMemo(() => {
        let result = [...data];

        // Filter
        if (filter === "reviewed") {
            result = result.filter(item => item.analyses?.length > 0);
        }

        // Sort
        result.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [data, filter, sortOrder]);

    // Derived state: Pagination
    const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
    const paginatedData = processedData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, sortOrder]);

    const confirmDelete = (id) => {
        setItemToDelete(id);
        setDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            const token = await getToken();
            // Note: Endpoint doesn't explicitly exist in user's prompt but usually /api/resume/:id exists.
            // If it fails, that's fine, we catch it.
            const apiUrl = import.meta.env.VITE_BACKEND_URL;
            const res = await fetch(`${apiUrl}/api/resume/${itemToDelete}`, {
                method: "DELETE",
                headers: {
                    "x-user-id": userId,
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });
            if (!res.ok) throw new Error("Failed to delete");

            setData(prev => prev.filter(item => item._id !== itemToDelete));
            toast.success("Resume deleted successfully.");
        } catch (err) {
            toast.error(err.message || "Failed to delete resume.");
        } finally {
            setIsDeleting(false);
            setDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    const handleView = (analysis) => {
        navigate("/review/results", { state: { analysis } });
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <LoadingSpinner text="Loading history..." />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            <PageHeader
                title="Resume History"
                subtitle="Access all your past resume reviews and generated documents in one place."
            />

            {data.length === 0 ? (
                <EmptyHistoryState />
            ) : (
                <>
                    <HistoryFilterBar
                        filter={filter}
                        setFilter={setFilter}
                        sortOrder={sortOrder}
                        setSortOrder={setSortOrder}
                    />

                    {processedData.length === 0 ? (
                        <div className="py-20 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl shadow-sm">
                            <p>No resumes match your current filter.</p>
                            <button
                                onClick={() => setFilter("all")}
                                className="mt-2 text-blue-600 font-medium hover:underline"
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {paginatedData.map(item => (
                                <HistoryCard
                                    key={item._id}
                                    item={item}
                                    onView={handleView}
                                    onDelete={confirmDelete}
                                />
                            ))}

                            <PaginationControls
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Reusable Confirm Modal */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => !isDeleting && setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Resume"
                description="Are you sure you want to delete this resume? This action cannot be undone and will permanently remove all associated AI analysis and score history."
                confirmText="Delete permanently"
                isDestructive={true}
                isLoading={isDeleting}
            />
        </div>
    );
}
