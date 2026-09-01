// © 2026 SDGP.lk
// Licensed under the GNU Affero General Public License v3.0 or later,
// with an additional restriction: Non-commercial use only.
// See <https://www.gnu.org/licenses/agpl-3.0.html> for details.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import * as z from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/prisma/prismaClient";
import { updateAsgardeoUserName } from "@/lib/auth/asgardeoScim";
import { apiErrorResponse } from "@/lib/api-error";
import { enforceSameOrigin } from "@/lib/auth/authRateLimit";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  image: z.string().url("Enter a valid image URL").or(z.literal("")).optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return apiErrorResponse("Error loading profile", error, "Could not load your profile.");
  }
}

export async function PATCH(req: Request) {
  try {
    const crossOrigin = enforceSameOrigin(req);
    if (crossOrigin) return crossOrigin;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const validationResult = profileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message ?? "Invalid details" },
        { status: 400 },
      );
    }

    const { name, image } = validationResult.data;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name, image: image || null },
      select: { id: true, name: true, email: true, image: true, role: true },
    });

    // Sign-in upserts the local row from Asgardeo's claims, so the name has to be pushed there too
    // or the next sign-in would silently revert this edit.
    if (user.email) await updateAsgardeoUserName(user.email, name);

    return NextResponse.json({ user });
  } catch (error) {
    return apiErrorResponse("Error updating profile", error, "Could not save your changes.");
  }
}
