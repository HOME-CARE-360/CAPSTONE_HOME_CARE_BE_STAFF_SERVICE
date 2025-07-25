import { sendTCPRequest } from "../tcp/client";

// Types for better type safety
interface TCPResponse<T = any> {
    statusCode: number;
    data?: T;
    message?: string;
    error?: string;
}

interface PaginationParams {
    page?: number;
    limit?: number;
}

interface BookingParams extends PaginationParams {
    staffId: number;
    status?: string;
}

interface InspectionReportData {
    staffId: number;
    bookingId: number;
    images: string[];
    note?: string;
    estimatedTime?: number;
}

interface UpdateInspectionData {
    note?: string;
    images?: string[];
    estimatedTime?: number;
}

class Logger {
    private static formatTimestamp(): string {
        return new Date().toISOString();
    }

    static logResponse<T>(operation: string, result: TCPResponse<T>): void {
        const timestamp = this.formatTimestamp();
        const isError = result?.statusCode && result.statusCode >= 400;

        if (isError) {
            console.error(`❌ [${timestamp}] ${operation} Failed (${result.statusCode}):`);
            console.error('Error:', result.error || result.message || 'Unknown error');
            if (result.data) {
                console.error('Data:', JSON.stringify(result.data, null, 2));
            }
        } else {
            console.log(`✅ [${timestamp}] ${operation} Success:`);
            if (result.data) {
                console.log(JSON.stringify(result.data, null, 2));
            }
        }
    }

    static logError(operation: string, error: Error): void {
        const timestamp = this.formatTimestamp();
        console.error(`💥 [${timestamp}] ${operation} Exception:`, error.message);
        console.error('Stack:', error.stack);
    }
}

class StaffApiClient {
    private static async safeRequest<T>(
        operation: string,
        requestData: { type: string; data: any }
    ): Promise<TCPResponse<T> | null> {
        try {
            const result = await sendTCPRequest(requestData) as TCPResponse<T>;
            Logger.logResponse(operation, result);
            return result;
        } catch (error) {
            Logger.logError(operation, error as Error);
            return null;
        }
    }

    static async getBookingsList(params: BookingParams): Promise<TCPResponse | null> {
        const { staffId, status, page = 1, limit = 10 } = params;

        if (!staffId || staffId <= 0) {
            throw new Error('Valid staffId is required');
        }

        return this.safeRequest('STAFF_GET_BOOKINGS', {
            type: 'STAFF_GET_BOOKINGS',
            data: { staffId, status, page, limit }
        });
    }

    static async getBookingDetail(bookingId: number, staffId: number): Promise<TCPResponse | null> {
        if (!bookingId || bookingId <= 0) {
            throw new Error('Valid bookingId is required');
        }
        if (!staffId || staffId <= 0) {
            throw new Error('Valid staffId is required');
        }

        return this.safeRequest('STAFF_GET_BOOKING_DETAIL', {
            type: 'STAFF_GET_BOOKING_DETAIL',
            data: { bookingId, staffId }
        });
    }

    static async createInspectionReport(data: InspectionReportData): Promise<TCPResponse | null> {
        if (!data.staffId || data.staffId <= 0) {
            throw new Error('Valid staffId is required');
        }
        if (!data.bookingId || data.bookingId <= 0) {
            throw new Error('Valid bookingId is required');
        }
        if (!data.images || data.images.length === 0) {
            throw new Error('At least one image is required');
        }

        return this.safeRequest('STAFF_CREATE_INSPECTION_REPORT', {
            type: 'STAFF_CREATE_INSPECTION_REPORT',
            data
        });
    }

    static async getReviews(staffId: number): Promise<TCPResponse | null> {
        if (!staffId || staffId <= 0) {
            throw new Error('Valid staffId is required');
        }

        return this.safeRequest('STAFF_GET_REVIEWS', {
            type: 'STAFF_GET_REVIEWS',
            data: { staffId }
        });
    }

    static async getInspectionReportsByStaff(staffId: number): Promise<TCPResponse | null> {
        if (!staffId || staffId <= 0) {
            throw new Error('Valid staffId is required');
        }

        return this.safeRequest('STAFF_GET_INSPECTION_REPORTS', {
            type: 'STAFF_GET_INSPECTION_REPORTS',
            data: { staffId }
        });
    }

    static async getInspectionReportDetail(inspectionId: number): Promise<TCPResponse | null> {
        if (!inspectionId || inspectionId <= 0) {
            throw new Error('Valid inspectionId is required');
        }

        return this.safeRequest('STAFF_GET_INSPECTION_DETAIL', {
            type: 'STAFF_GET_INSPECTION_DETAIL',
            data: { inspectionId }
        });
    }

    static async updateInspectionReport(
        inspectionId: number,
        updateData: UpdateInspectionData
    ): Promise<TCPResponse | null> {
        if (!inspectionId || inspectionId <= 0) {
            throw new Error('Valid inspectionId is required');
        }
        if (!updateData || Object.keys(updateData).length === 0) {
            throw new Error('Update data is required');
        }

        return this.safeRequest('UPDATE_INSPECTION_REPORT', {
            type: 'UPDATE_INSPECTION_REPORT',
            data: {
                inspectionId,
                dataInspection: updateData
            }
        });
    }

    static async getWorkLogs(staffId: number): Promise<TCPResponse | null> {
        if (!staffId || staffId <= 0) {
            throw new Error('Valid staffId is required');
        }

        return this.safeRequest('STAFF_GET_WORK_LOGS', {
            type: 'STAFF_GET_WORK_LOGS',
            data: { staffId }
        });
    }

    static async getPerformance(staffId: number): Promise<TCPResponse | null> {
        if (!staffId || staffId <= 0) {
            throw new Error('Valid staffId is required');
        }

        return this.safeRequest('STAFF_GET_PERFORMANCE', {
            type: 'STAFF_GET_PERFORMANCE',
            data: { staffId }
        });
    }

    static async getReviewSummary(staffId: number): Promise<TCPResponse | null> {
        if (!staffId || staffId <= 0) {
            throw new Error('Valid staffId is required');
        }

        return this.safeRequest('STAFF_GET_REVIEW_SUMMARY', {
            type: 'STAFF_GET_REVIEW_SUMMARY',
            data: { staffId }
        });
    }

    static async createWorkLog(staffId: number, bookingId: number): Promise<TCPResponse | null> {
        if (!staffId || staffId <= 0) {
            throw new Error('Valid staffId is required');
        }
        if (!bookingId || bookingId <= 0) {
            throw new Error('Valid bookingId is required');
        }

        return this.safeRequest('STAFF_CREATE_WORK_LOG', {
            type: 'STAFF_CREATE_WORK_LOG',
            data: { staffId, bookingId }
        });
    }

    static async checkOut(bookingId: number): Promise<TCPResponse | null> {
        if (!bookingId || bookingId <= 0) {
            throw new Error('Valid bookingId is required');
        }

        return this.safeRequest('STAFF_CHECK_OUT', {
            type: 'STAFF_CHECK_OUT',
            data: { bookingId }
        });
    }

    static async getBookingsByDate(
        staffId: number,
        date: string,
        params: PaginationParams = {}
    ): Promise<TCPResponse | null> {
        if (!staffId || staffId <= 0) {
            throw new Error('Valid staffId is required');
        }
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new Error('Valid date in YYYY-MM-DD format is required');
        }

        const { page = 1, limit = 10 } = params;

        return this.safeRequest('STAFF_GET_BOOKINGS_BY_DATE', {
            type: 'STAFF_GET_BOOKINGS_BY_DATE',
            data: { staffId, date, page, limit }
        });
    }

    static async getMonthlyStats(staffId: number, month: number, year: number): Promise<TCPResponse | null> {
        if (!staffId || staffId <= 0) {
            throw new Error('Valid staffId is required');
        }
        if (!month || month < 1 || month > 12) {
            throw new Error('Valid month (1-12) is required');
        }
        if (!year || year < 2000 || year > 3000) {
            throw new Error('Valid year is required');
        }

        return this.safeRequest('STAFF_GET_MONTHLY_STATS', {
            type: 'STAFF_GET_MONTHLY_STATS',
            data: { staffId, month, year }
        });
    }

    static async getBookingWorkflow(staffId: number, bookingId: number): Promise<TCPResponse | null> {
    if (!staffId || staffId <= 0) {
        throw new Error('Valid staffId is required');
    }
    if (!bookingId || bookingId <= 0) {
        throw new Error('Valid bookingId is required');
    }

    return this.safeRequest('STAFF_GET_BOOKING_WORKFLOW', {
        type: 'STAFF_GET_BOOKING_WORKFLOW',
        data: { staffId, bookingId }
    });
}

}

// Test configuration
interface TestConfig {
    staffId: number;
    bookingId: number;
    inspectionId: number;
}

class TestRunner {
    private config: TestConfig;

    constructor(config: TestConfig) {
        this.config = config;
    }

    async runBasicTests(): Promise<void> {
        console.log('🚀 Starting Basic Tests...\n');

        try {
            await StaffApiClient.getBookingsList({
                staffId: this.config.staffId,
                page: 1,
                limit: 10
            });

            await StaffApiClient.getBookingDetail(this.config.bookingId, this.config.staffId);

            await StaffApiClient.getReviews(this.config.staffId);

        } catch (error) {
            console.error('Basic tests failed:', error);
        }
    }

    async runWorkflowTests(): Promise<void> {
    console.log('\n🧩 Starting Workflow Tests (Booking + Inspection + Proposal)...\n');

    try {
        await StaffApiClient.getBookingWorkflow(this.config.staffId, this.config.bookingId);
    } catch (error) {
        console.error('Workflow tests failed:', error);
    }
}


    async runInspectionTests(): Promise<void> {
        console.log('\n🔍 Starting Inspection Tests...\n');

        try {
            await StaffApiClient.getInspectionReportsByStaff(this.config.staffId);

            await StaffApiClient.getInspectionReportDetail(this.config.inspectionId);

            // await StaffApiClient.createInspectionReport({
            //     staffId: this.config.staffId,
            //     bookingId: this.config.bookingId,
            //     images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
            //     note: "Đã kiểm tra toàn bộ hệ thống điện",
            //     estimatedTime: 90
            // });

        } catch (error) {
            console.error('Inspection tests failed:', error);
        }
    }

    async runPerformanceTests(): Promise<void> {
        console.log('\n📊 Starting Performance Tests...\n');

        try {
            await StaffApiClient.getWorkLogs(this.config.staffId);

            await StaffApiClient.getPerformance(this.config.staffId);

            await StaffApiClient.getReviewSummary(this.config.staffId);

            await StaffApiClient.getBookingsByDate(
                this.config.staffId,
                '2025-06-26',
                { page: 1, limit: 10 }
            );

            await StaffApiClient.getMonthlyStats(this.config.staffId, 6, 2025);

        } catch (error) {
            console.error('Performance tests failed:', error);
        }
    }

    async runUpdateTests(): Promise<void> {
        console.log('\n✏️ Starting Update Tests (Commented out to avoid side effects)...\n');


        // try {
        //     await StaffApiClient.updateInspectionReport(1, {
        //         note: 'Đã sửa đường ống bị rò rỉ, mất 90 phút',
        //         images: [
        //             'https://example.com/fix1.jpg',
        //             'https://example.com/fix2.jpg',
        //         ],
        //         estimatedTime: 90
        //     });
        //     
        //     await StaffApiClient.createWorkLog(this.config.staffId, this.config.bookingId);
        //     
        //     await StaffApiClient.checkOut(this.config.bookingId);
        //     
        // } catch (error) {
        //     console.error('Update tests failed:', error);
        // }

        console.log('Update tests are commented out to prevent side effects.');
    }

    async runAllTests(): Promise<void> {
        const startTime = Date.now();
        console.log('🎯 Starting Complete Test Suite...\n');

        await this.runBasicTests();
        await this.runInspectionTests();
        await this.runPerformanceTests();
        await this.runUpdateTests();
        await this.runWorkflowTests();

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        console.log(`\n✨ Test Suite Completed in ${duration}s`);
    }
}

// Main execution
(async () => {
    const testConfig: TestConfig = {
        staffId: 5,
        bookingId: 1,
        inspectionId: 2
    };

    const testRunner = new TestRunner(testConfig);
    await testRunner.runAllTests();
})();