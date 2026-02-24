import { NextResponse } from 'next/server';
import { getMeetings, createMeeting } from '../../lib/firebaseDB';

export async function GET(request) {
    try {
        const result = await getMeetings();
        if (result.success) {
            return NextResponse.json({ success: true, meetings: result.data });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const data = await request.json();

        // Generate meeting link if not provided
        if (!data.meetingLink) {
            const randomId = Math.floor(1000000000 + Math.random() * 9000000000);
            data.meetingLink = `https://zoom.us/j/${randomId}`;
            data.zoomMeetingId = randomId.toString();
        }

        // Call DB function
        const result = await createMeeting(data);

        if (result.success) {
            return NextResponse.json({
                success: true,
                meetingUrl: data.meetingLink,
                id: result.id
            });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
