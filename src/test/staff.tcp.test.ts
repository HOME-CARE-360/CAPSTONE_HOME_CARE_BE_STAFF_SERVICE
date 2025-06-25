import * as net from "net";
import { sendTCPRequest } from "../tcp/client";

/**
 * Log kết quả trả về theo chuẩn chung
 */
function logResponse(title: string, result: any, timestamp = new Date().toISOString()) {
    if (result?.statusCode && result.statusCode >= 400) {
        console.warn(`⚠️ [${timestamp}] ${title} Failed:`, result);
    } else {
        console.log(`✅ [${timestamp}] ${title} Success:`);
        console.dir(result, { depth: null });
    }
}

/**
 * Test lấy thông tin staff theo userId
 */
export async function testGetStaff(staffId: number) {
    const timestamp = new Date().toISOString();
    try {
        const result = await sendTCPRequest({
            type: "GET_STAFF",
            staffId,
        });
        logResponse("GET_STAFF", result, timestamp);
    } catch (error) {
        console.error(`❌ [${timestamp}] GET_STAFF Error:`, error);
    }
}

async function testGetBookingsList(staffId: number, status?: string, page = 1, limit = 10) {
    const res = await sendTCPRequest({
        type: 'STAFF_GET_BOOKINGS',
        staffId,
        status,
        page,
        limit,
    });
    logResponse('STAFF_GET_BOOKINGS', res);
}

async function testGetBookingDetail(bookingId: number) {
    const res = await sendTCPRequest({
        type: 'STAFF_GET_BOOKING_DETAIL',
        bookingId,
    });
    logResponse('STAFF_GET_BOOKING_DETAIL', res);
}

async function testUpdateInspectionStatus(bookingId: number, inspectionStatus: string, inspectionNote?: string) {
    const res = await sendTCPRequest({
        type: "STAFF_UPDATE_INSPECTION_STATUS",
        data: { bookingId, inspectionStatus, inspectionNote },
    });
    logResponse("STAFF_UPDATE_INSPECTION_STATUS", res);
}

async function testCreateInspectionReport(data: {
    staffId: number;
    bookingId: number;
    images: string[];
    note?: string;
    estimatedTime?: number;
}) {
    const res = await sendTCPRequest({
        type: "STAFF_CREATE_INSPECTION_REPORT",
        data,
    });
    logResponse("STAFF_CREATE_INSPECTION_REPORT", res);
}

async function testGetReviews(staffId: number) {
    const res = await sendTCPRequest({ type: "STAFF_GET_REVIEWS", staffId });
    logResponse("STAFF_GET_REVIEWS", res);
}


(async () => {
    const staffId = 5;
    const bookingId = 1;

    // await testGetStaff(staffId);
    // await testGetBookingsList(staffId);
        await testGetBookingDetail(bookingId);

    // await testUpdateInspectionStatus(bookingId, "DONE", "Khách hàng hài lòng, thiết bị hoạt động tốt");
    // await testCreateInspectionReport({
    //     staffId,
    //     bookingId,
    //     images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
    //     note: "Đã kiểm tra toàn bộ hệ thống điện",
    //     estimatedTime: 90,
    // });
    // await testGetReviews(staffId);
})();