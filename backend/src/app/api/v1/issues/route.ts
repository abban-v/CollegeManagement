import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { CreateIssueSchema, IssuePriorityEnum, IssueStatusEnum } from "@/lib/validation/issue";
import { issueService, FabricatedSpamError, DuplicateIssueError } from "@/modules/issues/service";
import { getErrorMessage, successResponse, errorResponse, sendJSON } from "@/lib/api";
import { withAuth } from "@/lib/auth";

/**
 * GET /api/v1/issues
 * 
 * List all issues with pagination and filtering
 * 
 * Query parameters:
 * - skip: number (default 0)
 * - take: number (default 20, max 100)
 * - status: IssueStatus (optional filter)
 * - priority: IssuePriority (optional filter)
 * - reporterId: string (optional filter)
 * 
 * Authentication: Not required initially, but will be required for filtering by reporterId
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0"));
    const take = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("take") || "20"))
    );
    const statusValue = IssueStatusEnum.safeParse(searchParams.get("status"));
    const priorityValue = IssuePriorityEnum.safeParse(searchParams.get("priority"));

    // Fetch issues
    const result = await issueService.listIssues({
      skip,
      take,
      status: statusValue.success ? statusValue.data : undefined,
      priority: priorityValue.success ? priorityValue.data : undefined,
    });

    return sendJSON(successResponse(result, 200));
  } catch (error: unknown) {
    console.error("Error listing issues:", error);
    return sendJSON(
      errorResponse(getErrorMessage(error, "Failed to list issues"), 500)
    );
  }
}

/**
 * POST /api/v1/issues
 * 
 * Create a new issue
 * 
 * Request body:
 * {
 *   title: string
 *   description: string
 *   category?: string
 *   department?: string
 *   location?: string
 *   suspectedCause?: string
 *   proposedSolution?: string
 * }
 * 
 * Authentication: Required (must be logged in to create an issue)
 * Authorization: STUDENT, OFFICIAL, ADMIN (anyone)
 */
export const POST = withAuth(async (request: NextRequest, _context, session) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedInput = CreateIssueSchema.parse(body);

    // Create the issue
    const issue = await issueService.createIssue(validatedInput, session.userId);

    return sendJSON(successResponse(issue, 201));
  } catch (error: unknown) {
    console.error("Error creating issue:", error);

    // Check if it's a DuplicateIssueError
    if (error instanceof DuplicateIssueError) {
      return sendJSON(errorResponse(error.message, 409));
    }

    // Check if it's a FabricatedSpamError (Spam rating > 80% and confidence < 30%)
    if (error instanceof FabricatedSpamError) {
      return sendJSON(errorResponse(error.message, 422));
    }

    // Check if it's a Zod validation error
    if (error instanceof ZodError) {
      return sendJSON(errorResponse(`Validation error: ${error.message}`, 400));
    }

    return sendJSON(
      errorResponse(getErrorMessage(error, "Failed to create issue"), 500)
    );
  }
});
