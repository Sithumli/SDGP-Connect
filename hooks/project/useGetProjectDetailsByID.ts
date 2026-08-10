import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { IProject } from '@/types/project/type';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface UseGetProjectDetailsByIDReturn {
  project: IProject | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch project details by ID
 * @param projectId The ID of the project to fetch
 * @returns Project details, loading state, error state, and refetch function
 */
export function useGetProjectDetailsByID(projectId: string): UseGetProjectDetailsByIDReturn {
  const [project, setProject] = useState<IProject | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) {
      setError(new Error('Project ID is required'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    // Kept until a request succeeds so retries don't tear down the error UI.

    try {
      const response = await axios.get<IProject>(`/api/projects/${projectId}`);
      setProject(response.data);
      setError(null);
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string }>;
      const errorMessage =
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Failed to fetch project details';
      // Carry the status so the UI can tell a 404 from a backend outage.
      const failure = Object.assign(new Error(errorMessage), {
        status: axiosError.response?.status,
      });
      setError(failure);
      setProject(null);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  return {
    project,
    isLoading,
    error,
    refetch: fetchProjectDetails
  };
}

export default useGetProjectDetailsByID;