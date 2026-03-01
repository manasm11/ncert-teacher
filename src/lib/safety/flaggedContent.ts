/**
 * Flagged Content Management for Gyanu AI
 *
 * Database schema and service for managing:
 * - Reports of flagged content (user inputs or AI outputs)
 * - Admin review workflow
 * - Content moderation history
 *
 * Forest/nature theme: Like maintaining a logbook of all visitors
 * to the forest and any concerns that need attention.
 */

import { ContentCategory, SeverityLevel } from "./rules";

// -----------------------------------------------------------------------
// Database Schema
// -----------------------------------------------------------------------

/**
 * Report status for admin review workflow
 */
export enum ReportStatus {
    PENDING = "pending",
    REVIEWED = "reviewed",
    APPROVED = "approved",
    BLOCKED = "blocked",
    EDUCATED = "educated", // User educated about appropriate content
}

/**
 * Report type
 */
export enum ReportType {
    USER_INPUT = "user_input", // User's message was flagged
    AI_OUTPUT = "ai_output", // AI response was flagged
    AUTO_BLOCKED = "auto_blocked", // Automatic block without review
}

/**
 * Severity for admin prioritization
 */
export enum ReportSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical",
}

// Re-export ContentCategory and SeverityLevel for convenience
export { ContentCategory, SeverityLevel } from "./rules";

// -----------------------------------------------------------------------
// TypeScript Interfaces
// -----------------------------------------------------------------------

/**
 * Database record for a flagged content report
 */
export interface FlaggedContentReport {
    id: string;
    userId: string;
    userMessage?: string;
    aiResponse?: string;
    reportType: ReportType;
    category: ContentCategory;
    severity: ReportSeverity;
    status: ReportStatus;
    moderatorId?: string; // Admin who reviewed
    moderatorAction?: "warn" | "block" | "educate" | "allow";
    notes?: string;
    createdAt: string;
    reviewedAt?: string;
    context?: {
        grade?: string;
        subject?: string;
        chapter?: string;
        routingIntent?: string;
    };
    metadata?: {
        patternsMatched: string[];
        score?: number;
        confidence?: number;
    };
}

/**
 * Summary view for admin dashboard
 */
export interface ReportSummary {
    id: string;
    userId: string;
    reportType: ReportType;
    category: ContentCategory;
    severity: ReportSeverity;
    status: ReportStatus;
    createdAt: string;
    userMessagePreview?: string;
    aiResponsePreview?: string;
}

/**
 * Pagination options for admin queries
 */
export interface PaginationOptions {
    limit: number;
    offset: number;
    sortBy?: "createdAt" | "severity" | "reviewedAt";
    sortOrder?: "asc" | "desc";
}

/**
 * Filter options for querying reports
 */
export interface ReportFilter {
    status?: ReportStatus[];
    category?: ContentCategory[];
    severity?: ReportSeverity[];
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
    reportType?: ReportType;
}

/**
 * Admin review action
 */
export interface ReviewAction {
    reportId: string;
    action: "warn" | "block" | "educate" | "allow";
    notes?: string;
}

/**
 * Statistics for admin dashboard
 */
export interface ModerationStats {
    totalReports: number;
    pendingReviews: number;
    approvedReports: number;
    blockedReports: number;
    reportsByCategory: Record<string, number>;
    reportsBySeverity: Record<string, number>;
    reportsByType: Record<string, number>;
}

// -----------------------------------------------------------------------
// Service Interface
// -----------------------------------------------------------------------

/**
 * Service for managing flagged content reports
 * In production, this would implement database operations
 */
export interface FlaggedContentService {
    // Create a new report
    createReport(report: Omit<FlaggedContentReport, "id" | "createdAt">): Promise<FlaggedContentReport>;

    // Get report by ID
    getReportById(reportId: string): Promise<FlaggedContentReport | null>;

    // Get all reports with filters and pagination
    getReports(filter?: ReportFilter, pagination?: PaginationOptions): Promise<ReportSummary[]>;

    // Get statistics for dashboard
    getStats(): Promise<ModerationStats>;

    // Update report status (admin review)
    updateReport(reportId: string, action: ReviewAction): Promise<FlaggedContentReport | null>;

    // Delete a report (for testing/cleanup)
    deleteReport(reportId: string): Promise<boolean>;

    // Find reports by user
    getReportsByUser(userId: string, pagination?: PaginationOptions): Promise<ReportSummary[]>;

    // Export reports for audit
    exportReports(filter?: ReportFilter): Promise<FlaggedContentReport[]>;
}

// -----------------------------------------------------------------------
// In-Memory Implementation (for development/testing)
// -----------------------------------------------------------------------

/**
 * Simple in-memory store for development
 * In production, replace with database implementation
 */
class InMemoryFlaggedContentService implements FlaggedContentService {
    private reports: Map<string, FlaggedContentReport> = new Map();

    async createReport(
        report: Omit<FlaggedContentReport, "id" | "createdAt">,
    ): Promise<FlaggedContentReport> {
        const id = `report_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
        const newReport: FlaggedContentReport = {
            ...report,
            id,
            createdAt: new Date().toISOString(),
        };

        this.reports.set(id, newReport);
        return newReport;
    }

    async getReportById(reportId: string): Promise<FlaggedContentReport | null> {
        return this.reports.get(reportId) || null;
    }

    async getReports(
        filter?: ReportFilter,
        pagination?: PaginationOptions,
    ): Promise<ReportSummary[]> {
        let results = Array.from(this.reports.values());

        // Apply filters
        if (filter) {
            if (filter.status) {
                results = results.filter((r) => filter.status?.includes(r.status));
            }
            if (filter.category) {
                results = results.filter((r) => filter.category?.includes(r.category));
            }
            if (filter.severity) {
                results = results.filter((r) => filter.severity?.includes(r.severity));
            }
            if (filter.userId) {
                results = results.filter((r) => r.userId === filter.userId);
            }
            if (filter.reportType) {
                results = results.filter((r) => r.reportType === filter.reportType);
            }
            if (filter.dateFrom || filter.dateTo) {
                results = results.filter((r) => {
                    const date = new Date(r.createdAt);
                    if (filter.dateFrom && date < new Date(filter.dateFrom)) return false;
                    if (filter.dateTo && date > new Date(filter.dateTo)) return false;
                    return true;
                });
            }
        }

        // Apply sorting
        const sortBy = pagination?.sortBy || "createdAt";
        const sortOrder = pagination?.sortOrder || "desc";
        results.sort((a, b) => {
            let comparison = 0;
            if (sortBy === "createdAt") {
                comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            } else if (sortBy === "severity") {
                comparison = a.severity.localeCompare(b.severity);
            } else if (sortBy === "reviewedAt") {
                comparison = (a.reviewedAt || "").localeCompare(b.reviewedAt || "");
            }
            return sortOrder === "asc" ? comparison : -comparison;
        });

        // Apply pagination
        const offset = pagination?.offset || 0;
        const limit = pagination?.limit || 20;
        results = results.slice(offset, offset + limit);

        // Convert to summary format
        return results.map((r) => ({
            id: r.id,
            userId: r.userId,
            reportType: r.reportType,
            category: r.category,
            severity: r.severity,
            status: r.status,
            createdAt: r.createdAt,
            userMessagePreview: r.userMessage?.substring(0, 100) + (r.userMessage && r.userMessage.length > 100 ? "..." : ""),
            aiResponsePreview: r.aiResponse?.substring(0, 100) + (r.aiResponse && r.aiResponse.length > 100 ? "..." : ""),
        }));
    }

    async getStats(): Promise<ModerationStats> {
        const reports = Array.from(this.reports.values());

        const stats: ModerationStats = {
            totalReports: reports.length,
            pendingReviews: reports.filter((r) => r.status === ReportStatus.PENDING).length,
            approvedReports: reports.filter((r) => r.status === ReportStatus.APPROVED).length,
            blockedReports: reports.filter((r) => r.status === ReportStatus.BLOCKED).length,
            reportsByCategory: {},
            reportsBySeverity: {},
            reportsByType: {},
        };

        // Count by category
        for (const report of reports) {
            stats.reportsByCategory[report.category] = (stats.reportsByCategory[report.category] || 0) + 1;
        }

        // Count by severity
        for (const report of reports) {
            stats.reportsBySeverity[report.severity] = (stats.reportsBySeverity[report.severity] || 0) + 1;
        }

        // Count by type
        for (const report of reports) {
            stats.reportsByType[report.reportType] = (stats.reportsByType[report.reportType] || 0) + 1;
        }

        return stats;
    }

    async updateReport(
        reportId: string,
        action: ReviewAction,
    ): Promise<FlaggedContentReport | null> {
        const report = this.reports.get(reportId);
        if (!report) return null;

        const updatedReport: FlaggedContentReport = {
            ...report,
            status: ReportStatus.REVIEWED,
            moderatorId: "admin", // In production, get from auth context
            moderatorAction: action.action,
            notes: action.notes,
            reviewedAt: new Date().toISOString(),
        };

        this.reports.set(reportId, updatedReport);
        return updatedReport;
    }

    async deleteReport(reportId: string): Promise<boolean> {
        return this.reports.delete(reportId);
    }

    async getReportsByUser(
        userId: string,
        pagination?: PaginationOptions,
    ): Promise<ReportSummary[]> {
        return this.getReports({ userId }, pagination);
    }

    async exportReports(filter?: ReportFilter): Promise<FlaggedContentReport[]> {
        return Array.from(this.reports.values()).filter((r) => {
            if (filter?.dateFrom && new Date(r.createdAt) < new Date(filter.dateFrom)) return false;
            if (filter?.dateTo && new Date(r.createdAt) > new Date(filter.dateTo)) return false;
            return true;
        });
    }
}

// -----------------------------------------------------------------------
// Service Factory
// -----------------------------------------------------------------------

/**
 * Get the flagged content service instance
 * In production, this would return a database-backed implementation
 */
let serviceInstance: FlaggedContentService | null = null;

export function getFlaggedContentService(): FlaggedContentService {
    if (!serviceInstance) {
        // Use in-memory service for development
        // Replace with database-backed implementation in production
        serviceInstance = new InMemoryFlaggedContentService();
    }
    return serviceInstance;
}

// -----------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------

/**
 * Convert API severity to database severity
 */
export function mapSeverityToReport(severity: SeverityLevel): ReportSeverity {
    const severityMap: Record<SeverityLevel, ReportSeverity> = {
        [SeverityLevel.LOW]: ReportSeverity.LOW,
        [SeverityLevel.MEDIUM]: ReportSeverity.MEDIUM,
        [SeverityLevel.HIGH]: ReportSeverity.HIGH,
        [SeverityLevel.CRITICAL]: ReportSeverity.CRITICAL,
    };
    return severityMap[severity] || ReportSeverity.LOW;
}

/**
 * Generate a user-friendly message based on report status
 */
export function getUserMessageForStatus(status: ReportStatus, type: ReportType): string {
    switch (status) {
        case ReportStatus.BLOCKED:
            if (type === ReportType.USER_INPUT) {
                return "I couldn't process that message. Let's focus on learning! What subject would you like to study?";
            }
            return "That response was flagged. Please try a different question.";
        case ReportStatus.APPROVED:
            return "Your content has been reviewed and approved. Thank you for following our community guidelines!";
        case ReportStatus.EDUCATED:
            return "Thank you for your understanding. Remember to keep your questions educational and respectful!";
        default:
            return "Your report is pending review. Thank you for your patience!";
    }
}

/**
 * Create a report from moderation result
 */
export function createReportFromModeration(
    content: string,
    type: ReportType,
    category: ContentCategory,
    severity: SeverityLevel,
    userId: string,
    context?: {
        grade?: string;
        subject?: string;
        chapter?: string;
        routingIntent?: string;
    },
    metadata?: {
        patternsMatched: string[];
        score?: number;
        confidence?: number;
    },
): Omit<FlaggedContentReport, "id" | "createdAt"> {
    return {
        userId,
        reportType: type,
        category,
        severity: mapSeverityToReport(severity),
        status: ReportStatus.PENDING,
        userMessage: type === ReportType.USER_INPUT ? content : undefined,
        aiResponse: type === ReportType.AI_OUTPUT ? content : undefined,
        context,
        metadata,
    };
}

// -----------------------------------------------------------------------
// Example Usage
// -----------------------------------------------------------------------

/**
 * Example: Creating and reviewing a report
 */
async function exampleUsage() {
    const service = getFlaggedContentService();

    // Create a report
    const report = await service.createReport(
        createReportFromModeration(
            "This is a test message with inappropriate content",
            ReportType.USER_INPUT,
            ContentCategory.HARASSMENT,
            SeverityLevel.HIGH,
            "user_123",
            {
                grade: "6",
                subject: "Science",
            },
            {
                patternsMatched: ["bully", "mock"],
                score: 25,
            },
        ),
    );

    console.log("Created report:", report.id);

    // Get reports
    const reports = await service.getReports();
    console.log("Total pending:", reports.length);

    // Review a report
    await service.updateReport(report.id, {
        reportId: report.id,
        action: "educate",
        notes: "User was new to the platform. Sent educational message about appropriate content.",
    });

    // Get stats
    const stats = await service.getStats();
    console.log("Moderation stats:", stats);
}
