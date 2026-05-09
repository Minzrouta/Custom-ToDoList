// src/app/api/workspaces/[id]/gitlab/route.ts
import { randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/auth-helpers";

const URL_REGEX = /^https?:\/\/.+/;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const member = await requireMembership(id, session.user.id);
    if (!member || member.role !== "OWNER") {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { gitlabProjectId, gitlabBaseUrl, regenerateSecret } = body as {
      gitlabProjectId?: string | null;
      gitlabBaseUrl?: string | null;
      regenerateSecret?: boolean;
    };

    // Validation : si baseUrl fourni non vide, doit matcher http(s)://...
    if (
      gitlabBaseUrl != null &&
      gitlabBaseUrl !== "" &&
      !URL_REGEX.test(gitlabBaseUrl)
    ) {
      return Response.json(
        { error: "Base URL invalide (http(s)://... attendu)" },
        { status: 400 },
      );
    }

    // Lire l'état courant du secret pour décider de le régénérer
    const current = await prisma.workspace.findUnique({
      where: { id },
      select: { gitlabWebhookSecret: true },
    });

    const newSecret =
      regenerateSecret || !current?.gitlabWebhookSecret
        ? randomBytes(32).toString("hex")
        : current.gitlabWebhookSecret;

    const workspace = await prisma.workspace.update({
      where: { id },
      data: {
        gitlabProjectId:
          gitlabProjectId === "" || gitlabProjectId == null
            ? null
            : gitlabProjectId,
        gitlabBaseUrl:
          gitlabBaseUrl === "" || gitlabBaseUrl == null ? null : gitlabBaseUrl,
        gitlabWebhookSecret: newSecret,
      },
      select: {
        id: true,
        gitlabProjectId: true,
        gitlabBaseUrl: true,
        gitlabWebhookSecret: true,
      },
    });

    return Response.json({ data: workspace });
  } catch (error) {
    console.error("[gitlab-config:PUT]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const member = await requireMembership(id, session.user.id);
    if (!member || member.role !== "OWNER") {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    await prisma.workspace.update({
      where: { id },
      data: {
        gitlabProjectId: null,
        gitlabBaseUrl: null,
        gitlabWebhookSecret: null,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[gitlab-config:DELETE]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
