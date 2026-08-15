// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.
import { NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { ProjectApprovalStatus } from "@/types/prisma-types";
import { apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    // Fetch featured projects that are APPROVED
    const featuredProjects = await prisma.projectMetadata.findMany({
      where: {
        featured: true,
        projectContent: {
          status: {
            approved_status: ProjectApprovalStatus.APPROVED, 
          },
        },
      },
      include: {
        projectContent: {
          include: {
            associations: {
              where: {
                type: "PROJECT_TYPE",
              },
            },
            status: true,
          },
        },
      },
    });

    // Format the response
    const formattedProjects = featuredProjects.map((project) => ({
      id: project.project_id,
      title: project.title,
      subtitle: project.subtitle || "",
      coverImage: project.cover_image || "",
      logo: project.logo || "",
      projectTypes:
        project.projectContent?.associations.map((association) => association.value) || [],
      status: project.projectContent?.status?.status || null,
    }));

    return NextResponse.json(formattedProjects);
  } catch (error) {
    return apiErrorResponse(
      "Error fetching featured projects",
      error,
      "Failed to load featured projects."
    );
  }
}
