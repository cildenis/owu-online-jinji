// app/api/meetings/route.js
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { collection, addDoc, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
import zoomService from '@/app/lib/zoomService';

export const dynamic = 'force-dynamic'; 

// 会議を作成
export async function POST(request) {
    try {
        const body = await request.json();
        const {
            title,
            description,
            scheduledAt,
            duration,
            organizerId,
            participantIds = [],
            password,
        } = body;

        if (!title || !scheduledAt || !duration || !organizerId) {
            return NextResponse.json(
                { success: false, error: '必須項目が入力されていません' },
                { status: 400 }
            );
        }

        const zoomResult = await zoomService.createMeeting({
            topic: title,
            agenda: description,
            startTime: scheduledAt,
            duration: parseInt(duration),
            password: password,
        });

        const meetingRef = await addDoc(collection(db, 'meetings'), {
            title,
            description: description || '',
            scheduledAt: Timestamp.fromDate(new Date(scheduledAt)),
            duration: parseInt(duration),
            organizerId,
            participantIds,
            zoomMeetingId: zoomResult.meetingId,
            meetingUrl: zoomResult.meetingUrl,
            hostUrl: zoomResult.hostUrl,
            password: zoomResult.password || '',
            status: 'scheduled',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        return NextResponse.json({
            success: true,
            message: '会議が作成されました',
            meetingId: meetingRef.id,
            meetingUrl: zoomResult.meetingUrl,
            hostUrl: zoomResult.hostUrl,
            password: zoomResult.password,
        });
    } catch (error) {
        console.error('会議作成エラー:', error);
        return NextResponse.json(
            { success: false, error: error.message || '会議を作成できませんでした' },
            { status: 500 }
        );
    }
}

// 会議一覧を取得
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const organizerId = searchParams.get('organizerId');
        const participantId = searchParams.get('participantId');
        const status = searchParams.get('status');

        let q;

        if (organizerId) {
            q = query(
                collection(db, 'meetings'),
                where('organizerId', '==', organizerId),
                orderBy('scheduledAt', 'desc')
            );
        } else if (participantId) {
            q = query(
                collection(db, 'meetings'),
                where('participantIds', 'array-contains', participantId),
                orderBy('scheduledAt', 'desc')
            );
        } else {
            q = query(
                collection(db, 'meetings'),
                orderBy('scheduledAt', 'desc')
            );
        }

        const querySnapshot = await getDocs(q);
        const meetings = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            meetings.push({
                id: doc.id,
                ...data,
                scheduledAt: data.scheduledAt?.toDate().toISOString(),
                createdAt: data.createdAt?.toDate().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString(),
            });
        });

        let filteredMeetings = meetings;
        if (status) {
            filteredMeetings = meetings.filter(m => m.status === status);
        }

        return NextResponse.json({
            success: true,
            meetings: filteredMeetings,
            count: filteredMeetings.length
        });
    } catch (error) {
        console.error('会議一覧取得エラー:', error);
        return NextResponse.json(
            { success: false, error: '会議一覧を取得できませんでした' },
            { status: 500 }
        );
    }
}
