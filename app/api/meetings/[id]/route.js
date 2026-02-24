// app/api/meetings/[id]/route.js
import { NextResponse } from 'next/server';
import { db } from '@/firebase/config';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import zoomService from '@/app/lib/zoomService';

// 会議詳細を取得
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const meetingDoc = await getDoc(doc(db, 'meetings', id));

    if (!meetingDoc.exists()) {
      return NextResponse.json(
        { success: false, error: '会議が見つかりません' },
        { status: 404 }
      );
    }

    const data = meetingDoc.data();
    return NextResponse.json({
      success: true,
      meeting: {
        id: meetingDoc.id,
        ...data,
        scheduledAt: data.scheduledAt?.toDate().toISOString(),
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
      },
    });
  } catch (error) {
    console.error('会議取得エラー:', error);
    return NextResponse.json(
      { success: false, error: '会議情報を取得できませんでした' },
      { status: 500 }
    );
  }
}

// 会議を更新
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, description, scheduledAt, duration, status } = body;

    const meetingDoc = await getDoc(doc(db, 'meetings', id));
    if (!meetingDoc.exists()) {
      return NextResponse.json(
        { success: false, error: '会議が見つかりません' },
        { status: 404 }
      );
    }

    const meetingData = meetingDoc.data();

    // Zoomで更新
    const zoomUpdates = {};
    if (title) zoomUpdates.topic = title;
    if (description) zoomUpdates.agenda = description;
    if (scheduledAt) zoomUpdates.start_time = new Date(scheduledAt).toISOString();
    if (duration) zoomUpdates.duration = parseInt(duration);

    if (Object.keys(zoomUpdates).length > 0) {
      await zoomService.updateMeeting(meetingData.zoomMeetingId, zoomUpdates);
    }

    // Firestoreで更新
    const updates = {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(scheduledAt && { scheduledAt: Timestamp.fromDate(new Date(scheduledAt)) }),
      ...(duration && { duration: parseInt(duration) }),
      ...(status && { status }),
      updatedAt: Timestamp.now(),
    };

    await updateDoc(doc(db, 'meetings', id), updates);

    return NextResponse.json({
      success: true,
      message: '会議が更新されました'
    });
  } catch (error) {
    console.error('会議更新エラー:', error);
    return NextResponse.json(
      { success: false, error: '会議を更新できませんでした' },
      { status: 500 }
    );
  }
}

// 会議を削除
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const meetingDoc = await getDoc(doc(db, 'meetings', id));
    if (!meetingDoc.exists()) {
      return NextResponse.json(
        { success: false, error: '会議が見つかりません' },
        { status: 404 }
      );
    }

    const meetingData = meetingDoc.data();

    // Zoomから削除
    await zoomService.deleteMeeting(meetingData.zoomMeetingId);

    // Firestoreから削除
    await deleteDoc(doc(db, 'meetings', id));

    return NextResponse.json({
      success: true,
      message: '会議が削除されました'
    });
  } catch (error) {
    console.error('会議削除エラー:', error);
    return NextResponse.json(
      { success: false, error: '会議を削除できませんでした' },
      { status: 500 }
    );
  }
}