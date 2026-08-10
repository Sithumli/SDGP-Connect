// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.
"use client";
import { ErrorState } from "@/components/ui/error-state";
import { useGetProjectDetailsByID } from "@/hooks/project/useGetProjectDetailsByID";
import { IProjectAssociation } from "@/types/project/type";
import { HeroSection } from "./s-project/hero-section";
import { ProjectAssociation } from "./s-project/project-associations";
import { ProjectHeader } from "./s-project/project-header";
import { ProjectOverview } from "./s-project/project-overview";
import { SlideDeck } from "./s-project/slide-deck";
import Teamandsocial from "./s-project/team-social";
import { Spinner } from "./ui/spinner";

const ProjectDetails = ({ projectID }: { projectID: string }) => {
  const { project, isLoading, error, refetch } = useGetProjectDetailsByID(projectID);

  // While a retry is in flight we keep the error UI on screen rather than
  // swapping back to a spinner, so a visitor mid-game isn't interrupted.
  if (isLoading && !error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner variant="ring" className="size-24" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-16">
        <ErrorState
          error={error}
          description="We couldn't load this project right now. We'll keep trying in the background — feel free to play a round while you wait."
          onRetry={refetch}
          isRetrying={isLoading}
        />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-16">
        <ErrorState
          title="Project not found"
          description="This project doesn't exist or may have been removed."
          showGame={false}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <HeroSection coverImage={project.metadata.cover_image} />
      <div className="container mx-auto px-4 pb-16">
        <ProjectHeader
          title={project.metadata.title}
          subtitle={project.metadata.subtitle}
          domains={(project.content?.associations || [])
            .filter(
              (
                association
              ): association is IProjectAssociation & {
                domain: NonNullable<IProjectAssociation["domain"]>;
              } => association.domain != null
            )
            .map((association) => association.domain)}
          status={project.content?.status?.status}
          logo={project.metadata.logo}
          website={project.metadata.website}
          projectId={project.metadata.project_id}
        />
        <ProjectOverview
          problemStatement={project.content?.projectDetails?.problem_statement}
          solution={project.content?.projectDetails?.solution}
          keyFeatures={project.content?.projectDetails?.features}
          teamNumber={project.metadata.group_num}
          projectYear={project.metadata.sdgp_year}
        />
        {project.content?.slides && (
          <SlideDeck slides={project.content?.slides} />
        )}
        <ProjectAssociation
          associations={project.content?.associations || []}
        />
        <Teamandsocial
          teamMembers={project.content?.team || []}
          teamSocials={project.content?.socialLinks || []}
          teamPhone={project.content?.projectDetails?.team_phone}
          teamEmail={project.content?.projectDetails?.team_email}
          projectTitle={project.metadata.title}
        />
      </div>
    </div>
  );
};

export default ProjectDetails;
