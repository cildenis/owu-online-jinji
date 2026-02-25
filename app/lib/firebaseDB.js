import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getCountFromServer,
  Timestamp
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase';


// ============================================================================
// AUTH OPERATIONS (認証操作)
// ============================================================================

export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Firestore'dan kullanıcı bilgilerini al
    const usersQuery = query(
      collection(db, 'users'),
      where('uid', '==', userCredential.user.uid)
    );
    const querySnapshot = await getDocs(usersQuery);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return {
        success: true,
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          ...userDoc.data()
        }
      };
    } else {
      return { success: false, error: 'ユーザー情報が見つかりません' };
    }
  } catch (error) {
    console.error('ログインエラー:', error);
    return { success: false, error: error.message };
  }
}

export async function registerUser(userData) {
  try {
    // 1. Authentication'da kullanıcı oluştur
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );

    // 2. Firestore'a kullanıcı bilgilerini kaydet
    await addDoc(collection(db, 'users'), {
      uid: userCredential.user.uid,
      email: userData.email,
      fullName: userData.fullName,
      role: userData.role || 'applicant',
      phone: userData.phone || '',
      employeeId: userData.employeeId || null,
      createdAt: new Date().toISOString()
    });

    return {
      success: true,
      user: {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        ...userData
      }
    };
  } catch (error) {
    console.error('レジスタエラー:', error);
    return { success: false, error: error.message };
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('ログアウトエラー:', error);
    return { success: false, error: error.message };
  }
}


// ============================================================================
// DASHBOARD STATS OPERATIONS (ダッシュボード統計)
// ============================================================================

// Çalışan sayısını getir (Optimized)
export async function getEmployeesCount() {
  try {
    const coll = collection(db, 'employees');
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
  } catch (error) {
    console.error('従業員数取得エラー:', error);
    return 0;
  }
}

// Bekleyen休暇申請sayısını getir (Optimized)
export async function getPendingLeaves() {
  try {
    const q = query(
      collection(db, 'leaveRequests'),
      where('status', '==', 'pending')
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('承認待ち休暇取得エラー:', error);
    return 0;
  }
}

// 全ての休暇申請sayısını getir (Optimized)
export async function getTotalLeaveCount() {
  try {
    const coll = collection(db, 'leaveRequests');
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
  } catch (error) {
    console.error('全休暇申請取得エラー:', error);
    return 0;
  }
}

// Aktif求人sayısını getir (Optimized)
export async function getActiveJobs() {
  try {
    const q = query(
      collection(db, 'jobs'),
      where('status', '==', 'active')
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('公開求人取得エラー:', error);
    return 0;
  }
}

// 応募数sayısını getir (Optimized)
export async function getApplicationsCount() {
  try {
    const coll = collection(db, 'applications');
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
  } catch (error) {
    console.error('応募数取得エラー:', error);
    return 0;
  }
}

// 全ての会議sayısını getir (Optimized)
export async function getTotalMeetingsCount() {
  try {
    const coll = collection(db, 'meetings');
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
  } catch (error) {
    console.error('全会議取得エラー:', error);
    return 0;
  }
}

export async function GET(req) {
  const { db } = await import("@/lib/firebase");
}
// Bugünkü会議sayısını getir (Optimized with Query)
export async function getTodayMeetings() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Convert Date to Firestore Timestamp if needed, or ISO string depending on storage format.
    // Assuming ISO string as per other functions, but better to support both or range query.
    // If 'startTime' is stored as ISO string:
    const todayISO = today.toISOString();
    const tomorrowISO = tomorrow.toISOString();

    const q = query(
      collection(db, 'meetings'),
      where('startTime', '>=', todayISO),
      where('startTime', '<', tomorrowISO)
    );

    // Also consider 'scheduledAt' if that's used.
    // Since we want just a count, we can use getCountFromServer IF we trust the query index.
    // But multiple field queries might require index. 
    // Let's stick to getDocs for this one small subset but limited by date, which is much better than ALL.

    const snapshot = await getDocs(q);

    // Filter locally for status if not in query (to avoid complex index requirement)
    // or assume all scheduled meetings for today count.

    // Actually, let's use getCountFromServer with status filter if possible?
    // It might require composite index [startTime + status].
    // To be safe and fast without index errors, getting docs for just "Today" is fine.
    // It's much narrower than "All Time".

    let count = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'scheduled';
      if (status === 'scheduled' || status === 'ongoing') {
        count++;
      }
    });

    return count;

  } catch (error) {
    console.error('今日の会議取得エラー:', error);
    return 0;
  }
}


// ============================================================================
// EMPLOYEE OPERATIONS (従業員管理)
// ============================================================================

export async function getEmployees() {
  try {
    console.log('getEmployeesが呼び出されました');
    const querySnapshot = await getDocs(collection(db, 'employees'));
    const employees = [];

    querySnapshot.forEach((doc) => {
      employees.push({
        id: doc.id,
        ...doc.data()
      });
    });

    employees.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    console.log('従業員総数:', employees.length);
    return { success: true, data: employees };
  } catch (error) {
    console.error('getEmployeesエラー:', error);
    return { success: false, error: error.message };
  }
}

export async function addEmployee(employeeData) {
  try {
    console.log('addEmployeeが呼び出されました:', employeeData);

    const now = new Date().toISOString();

    const docRef = await addDoc(collection(db, 'employees'), {
      fullName: employeeData.fullName,
      email: employeeData.email,
      phone: employeeData.phone,
      department: employeeData.department,
      position: employeeData.position,
      hireDate: employeeData.hireDate,
      salary: parseFloat(employeeData.salary) || 0,
      status: employeeData.status || 'active',
      createdAt: now,
      updatedAt: now
    });

    console.log('従業員を追加しました！ID:', docRef.id);

    return {
      success: true,
      data: {
        id: docRef.id,
        ...employeeData,
        createdAt: now,
        updatedAt: now
      }
    };
  } catch (error) {
    console.error('従業員の追加エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function updateEmployee(id, employeeData) {
  try {
    const now = new Date().toISOString();
    const employeeRef = doc(db, 'employees', id);

    await updateDoc(employeeRef, {
      fullName: employeeData.fullName,
      email: employeeData.email,
      phone: employeeData.phone,
      department: employeeData.department,
      position: employeeData.position,
      hireDate: employeeData.hireDate,
      salary: parseFloat(employeeData.salary) || 0,
      status: employeeData.status,
      updatedAt: now
    });

    return { success: true };
  } catch (error) {
    console.error('従業員の更新エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteEmployee(id) {
  try {
    await deleteDoc(doc(db, 'employees', id));
    return { success: true };
  } catch (error) {
    console.error('従業員削除エラー:', error);
    return { success: false, error: error.message };
  }
}


// ============================================================================
// JOB OPERATIONS (求人管理)
// ============================================================================

export async function getJobs(status = 'active') {
  try {
    const q = query(
      collection(db, 'jobs'),
      where('status', '==', status),
      orderBy('postedDate', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const jobs = [];

    querySnapshot.forEach((doc) => {
      jobs.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, data: jobs };
  } catch (error) {
    console.error('求人取得エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function addJob(jobData) {
  try {
    const now = new Date().toISOString();

    const docRef = await addDoc(collection(db, 'jobs'), {
      ...jobData,
      postedDate: now,
      createdAt: now,
      updatedAt: now
    });

    return {
      success: true,
      data: {
        id: docRef.id,
        ...jobData,
        postedDate: now,
        createdAt: now,
        updatedAt: now
      }
    };
  } catch (error) {
    console.error('求人エラーの追加', error);
    return { success: false, error: error.message };
  }
}


// ============================================================================
// APPLICATION OPERATIONS (応募管理)
// ============================================================================

export async function submitApplication(applicationData) {
  try {
    console.log('=== submitApplication 開始 ===');
    console.log('受信データ:', applicationData);

    // CV URL チェック
    if (!applicationData.cvFileUrl) {
      console.error('❌ cvFileUrl が空です！');
      throw new Error('履歴書URLが見つかりません');
    }

    console.log('✅ cvFileUrl 確認:', applicationData.cvFileUrl);

    const now = new Date().toISOString();

    const dataToSave = {
      jobId: applicationData.jobId,
      applicantName: applicationData.applicantName,
      applicantEmail: applicationData.applicantEmail,
      applicantPhone: applicationData.applicantPhone || '',
      cvText: applicationData.cvText || '',
      cvFileUrl: applicationData.cvFileUrl, // ✅ 重要！
      coverLetter: applicationData.coverLetter || '',
      aiScore: applicationData.aiScore || null,
      aiAnalysis: applicationData.aiAnalysis || null,
      status: applicationData.status || 'pending',
      appliedAt: now,
      updatedAt: now
    };

    console.log('Firestoreに保存するデータ:', dataToSave);

    const docRef = await addDoc(collection(db, 'applications'), dataToSave);

    console.log('✅ 保存完了！Document ID:', docRef.id);

    return {
      success: true,
      data: {
        id: docRef.id,
        ...dataToSave
      }
    };
  } catch (error) {
    console.error('❌ アプリケーション送信エラー:', error);
    console.error('エラー詳細:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getApplications(jobId = null) {
  try {
    let q;

    if (jobId) {
      q = query(
        collection(db, 'applications'),
        where('jobId', '==', jobId),
        orderBy('appliedAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'applications'),
        orderBy('appliedAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    const applications = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Application ${doc.id} - cvFileUrl:`, data.cvFileUrl); // Debug
      applications.push({
        id: doc.id,
        ...data
      });
    });

    console.log(`取得した応募数: ${applications.length}`);
    return { success: true, data: applications };
  } catch (error) {
    console.error('アプリケーションエラーの取得:', error);
    return { success: false, error: error.message };
  }
}

export async function updateApplication(id, applicationData) {
  try {
    const now = new Date().toISOString();
    const appRef = doc(db, 'applications', id);

    await updateDoc(appRef, {
      ...applicationData,
      updatedAt: now
    });

    console.log('アプリケーションを更新しました！ID:', id);
    return { success: true };
  } catch (error) {
    console.error('アプリケーション更新エラー:', error);
    return { success: false, error: error.message };
  }
}


// ============================================================================
// FILE UPLOAD OPERATIONS (ファイルアップロード)
// ============================================================================

export async function uploadCV(file, applicantEmail) {
  try {
    console.log('=== uploadCV 開始 ===');
    console.log('ファイル名:', file.name);
    console.log('ファイルサイズ:', file.size);
    console.log('ファイルタイプ:', file.type);
    console.log('応募者メール:', applicantEmail);

    const timestamp = Date.now();
    const fileName = `${applicantEmail}_${timestamp}_${file.name}`;
    const storageRef = ref(storage, `cvs/${fileName}`);

    console.log('Storage パス:', `cvs/${fileName}`);
    console.log('アップロード開始...');

    await uploadBytes(storageRef, file);
    console.log('✅ アップロード完了');

    console.log('ダウンロードURL取得中...');
    const downloadURL = await getDownloadURL(storageRef);
    console.log('✅ ダウンロードURL:', downloadURL);

    return {
      success: true,
      url: downloadURL,
      fileName
    };
  } catch (error) {
    console.error('❌ 履歴書アップロードエラー:', error);
    console.error('エラーコード:', error.code);
    console.error('エラーメッセージ:', error.message);
    return { success: false, error: error.message };
  }
}


// ============================================================================
// LEAVE REQUEST OPERATIONS (休暇管理)
// ============================================================================

export async function getLeaveRequests() {
  try {
    const q = query(
      collection(db, 'leaveRequests'),
      orderBy('requestDate', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const leaves = [];

    querySnapshot.forEach((doc) => {
      leaves.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log('休暇申請を取得しました:', leaves.length);
    return { success: true, data: leaves };
  } catch (error) {
    console.error('休暇申請エラーの取得:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function addLeaveRequest(leaveData) {
  try {
    const now = new Date().toISOString();

    const docRef = await addDoc(collection(db, 'leaveRequests'), {
      employeeName: leaveData.employeeName,
      employeeId: leaveData.employeeId,
      employeeEmail: leaveData.employeeEmail,
      leaveType: leaveData.leaveType,
      startDate: leaveData.startDate,
      endDate: leaveData.endDate,
      days: leaveData.days,
      reason: leaveData.reason,
      status: leaveData.status || 'pending',
      requestDate: leaveData.requestDate,
      approvedBy: leaveData.approvedBy || null,
      rejectionReason: leaveData.rejectionReason || null,
      createdAt: now,
      updatedAt: now
    });

    console.log('休暇申請を追加しました！ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('休暇申請の追加エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function updateLeaveRequest(leaveId, updates) {
  try {
    const now = new Date().toISOString();
    const leaveRef = doc(db, 'leaveRequests', leaveId);

    await updateDoc(leaveRef, {
      ...updates,
      updatedAt: now
    });

    console.log('休暇申請を更新しました！ID:', leaveId);
    return { success: true };
  } catch (error) {
    console.error('休暇申請の更新エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserLeaveRequests(userEmail) {
  try {
    const q = query(
      collection(db, 'leaveRequests'),
      where('employeeEmail', '==', userEmail),
      orderBy('requestDate', 'desc')
    );
    const querySnapshot = await getDocs(q);

    const leaves = [];
    querySnapshot.forEach((doc) => {
      leaves.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, data: leaves };
  } catch (error) {
    console.error('ユーザー休暇申請エラーの取得:', error);
    return { success: false, error: error.message, data: [] };
  }
}


// ============================================================================
// MEETING OPERATIONS (会議管理)
// ============================================================================

export async function getMeetings() {
  try {
    const q = query(
      collection(db, 'meetings'),
      orderBy('startTime', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const meetings = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      meetings.push({
        id: doc.id,
        ...data,
        // Fallbacks for older records to match frontend (MeetingManagement.js)
        scheduledAt: data.scheduledAt || data.startTime,
        meetingUrl: data.meetingUrl || data.meetingLink
      });
    });

    console.log('会議を取得しました:', meetings.length);
    return { success: true, data: meetings };
  } catch (error) {
    console.error('会議取得エラー:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function createMeeting(meetingData) {
  try {
    const now = new Date().toISOString();

    // Map conflicting field names from frontend
    // Frontend sends 'scheduledAt' and 'duration', DB expects 'startTime' and 'endTime'
    const startTime = meetingData.startTime || meetingData.scheduledAt;

    let endTime = meetingData.endTime;
    if (!endTime && startTime && meetingData.duration) {
      const start = new Date(startTime);
      const end = new Date(start.getTime() + meetingData.duration * 60000);
      endTime = end.toISOString();
    }

    const docRef = await addDoc(collection(db, 'meetings'), {
      title: meetingData.title,
      description: meetingData.description || '',
      startTime: startTime,
      scheduledAt: startTime, // Alignment: MeetingManagement expects scheduledAt
      endTime: endTime,
      duration: meetingData.duration || 60, // Alignment: MeetingManagement expects duration
      organizer: meetingData.organizer || '',
      organizerEmail: meetingData.organizerEmail || '',
      participants: meetingData.participants || [],
      meetingLink: meetingData.meetingLink || '',
      meetingUrl: meetingData.meetingLink || '', // Alignment: MeetingManagement expects meetingUrl
      zoomMeetingId: meetingData.zoomMeetingId || '',
      password: meetingData.password || '', // Ensure password is saved
      status: meetingData.status || 'scheduled',
      agenda: meetingData.agenda || '',
      notes: meetingData.notes || '',
      createdAt: now,
      updatedAt: now
    });

    console.log('会議を作成しました！ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('会議作成エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function updateMeeting(meetingId, updates) {
  try {
    const now = new Date().toISOString();
    const meetingRef = doc(db, 'meetings', meetingId);

    await updateDoc(meetingRef, {
      ...updates,
      updatedAt: now
    });

    console.log('会議を更新しました！ID:', meetingId);
    return { success: true };
  } catch (error) {
    console.error('会議更新エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteMeeting(meetingId) {
  try {
    await deleteDoc(doc(db, 'meetings', meetingId));
    console.log('会議を削除しました！ID:', meetingId);
    return { success: true };
  } catch (error) {
    console.error('会議削除エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserMeetings(userEmail) {
  try {
    const q = query(
      collection(db, 'meetings'),
      where('participants', 'array-contains', userEmail),
      orderBy('startTime', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const meetings = [];

    querySnapshot.forEach((doc) => {
      meetings.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, data: meetings };
  } catch (error) {
    console.error('ユーザー会議取得エラー:', error);
    return { success: false, error: error.message, data: [] };
  }
}


// ============================================================================
// RINGI SYSTEM OPERATIONS (稟議システム)
// ============================================================================

export async function getRingiDocuments() {
  try {
    const q = query(
      collection(db, 'ringi'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const ringis = [];

    querySnapshot.forEach((doc) => {
      ringis.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log('稟議を取得しました:', ringis.length);
    return { success: true, data: ringis };
  } catch (error) {
    console.error('稟議取得エラー:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getPendingRingiCount() {
  try {
    const q = query(
      collection(db, 'ringi'),
      where('finalStatus', '==', 'pending')
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('承認待ち稟議取得エラー:', error);
    return 0;
  }
}

export async function createRingi(ringiData) {
  try {
    const now = new Date().toISOString();

    const docRef = await addDoc(collection(db, 'ringi'), {
      title: ringiData.title,
      category: ringiData.category,
      purpose: ringiData.purpose,
      details: ringiData.details,
      amount: ringiData.amount || null,
      requester: ringiData.requester,
      requesterEmail: ringiData.requesterEmail,
      requestDate: ringiData.requestDate,
      approvalChain: ringiData.approvalChain,
      currentApprover: ringiData.currentApprover || 0,
      finalStatus: 'pending',
      attachments: ringiData.attachments || [],
      urgency: ringiData.urgency || 'normal',
      relatedDocuments: ringiData.relatedDocuments || [],
      createdAt: now,
      updatedAt: now
    });

    console.log('稟議を作成しました！ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('稟議作成エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function approveOrRejectRingi(ringiId, approverIndex, decision, comment = '', hankoData = null) {
  try {
    const ringiRef = doc(db, 'ringi', ringiId);
    const ringiSnap = await getDoc(ringiRef);

    if (!ringiSnap.exists()) {
      throw new Error('稟議が見つかりません');
    }

    const ringiData = ringiSnap.data();
    const approvalChain = [...ringiData.approvalChain];

    approvalChain[approverIndex] = {
      ...approvalChain[approverIndex],
      status: decision,
      approvedAt: new Date().toISOString(),
      comment: comment,
      hanko: hankoData
    };

    let finalStatus = ringiData.finalStatus;
    let currentApprover = ringiData.currentApprover;

    if (decision === 'rejected') {
      finalStatus = 'rejected';
    } else if (decision === 'approved') {
      if (approverIndex === approvalChain.length - 1) {
        finalStatus = 'approved';
      } else {
        currentApprover = approverIndex + 1;
      }
    }

    await updateDoc(ringiRef, {
      approvalChain: approvalChain,
      currentApprover: currentApprover,
      finalStatus: finalStatus,
      updatedAt: new Date().toISOString()
    });

    console.log('稟議を更新しました！ID:', ringiId);
    return { success: true };
  } catch (error) {
    console.error('稟議更新エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function cancelRingi(ringiId, reason) {
  try {
    const ringiRef = doc(db, 'ringi', ringiId);

    await updateDoc(ringiRef, {
      finalStatus: 'cancelled',
      cancellationReason: reason,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log('稟議をキャンセルしました！ID:', ringiId);
    return { success: true };
  } catch (error) {
    console.error('稟議キャンセルエラー:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserRingi(userEmail) {
  try {
    const q = query(
      collection(db, 'ringi'),
      where('requesterEmail', '==', userEmail),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const ringis = [];

    querySnapshot.forEach((doc) => {
      ringis.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, data: ringis };
  } catch (error) {
    console.error('ユーザー稟議取得エラー:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getPendingRingiForApprover(approverEmail) {
  try {
    const allRingis = await getRingiDocuments();

    if (!allRingis.success) {
      return allRingis;
    }

    const pendingRingis = allRingis.data.filter(ringi => {
      if (ringi.finalStatus !== 'pending') return false;

      const currentApprover = ringi.approvalChain[ringi.currentApprover];
      return currentApprover && currentApprover.email === approverEmail && currentApprover.status === 'pending';
    });

    return { success: true, data: pendingRingis };
  } catch (error) {
    console.error('承認待ち稟議取得エラー:', error);
    return { success: false, error: error.message, data: [] };
  }
}


// ============================================================================
// OVERTIME MANAGEMENT OPERATIONS (残業管理)
// ============================================================================

export async function getOvertimeRecords() {
  try {
    const q = query(
      collection(db, 'overtime'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const records = [];

    querySnapshot.forEach((doc) => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log('残業記録を取得しました:', records.length);
    return { success: true, data: records };
  } catch (error) {
    console.error('残業記録取得エラー:', error);
    return { success: false, error: error.message, data: [] };
  }
}

// 承認待ち残業記録sayısını getir (Optimized)
export async function getPendingOvertimeCount() {
  try {
    const q = query(
      collection(db, 'overtime'),
      where('status', '==', 'pending')
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('承認待ち残業記録取得エラー:', error);
    return 0;
  }
}

// 全ての残業記録sayısını getir (Optimized)
export async function getTotalOvertimeCount() {
  try {
    const coll = collection(db, 'overtime');
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
  } catch (error) {
    console.error('全残業記録取得エラー:', error);
    return 0;
  }
}

export async function addOvertimeRecord(overtimeData) {
  try {
    const now = new Date().toISOString();

    const docRef = await addDoc(collection(db, 'overtime'), {
      employeeId: overtimeData.employeeId,
      employeeName: overtimeData.employeeName,
      employeeEmail: overtimeData.employeeEmail,
      date: overtimeData.date,
      startTime: overtimeData.startTime,
      endTime: overtimeData.endTime,
      hours: overtimeData.hours,
      overtimeType: overtimeData.overtimeType,
      reason: overtimeData.reason,
      status: overtimeData.status || 'pending',
      approvedBy: overtimeData.approvedBy || null,
      rejectionReason: overtimeData.rejectionReason || null,
      compensation: overtimeData.compensation || 'pay',
      createdAt: now,
      updatedAt: now
    });

    console.log('残業記録を追加しました！ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('残業記録の追加エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function updateOvertimeRecord(overtimeId, updates) {
  try {
    const now = new Date().toISOString();
    const overtimeRef = doc(db, 'overtime', overtimeId);

    await updateDoc(overtimeRef, {
      ...updates,
      updatedAt: now
    });

    console.log('残業記録を更新しました！ID:', overtimeId);
    return { success: true };
  } catch (error) {
    console.error('残業記録の更新エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteOvertimeRecord(overtimeId) {
  try {
    await deleteDoc(doc(db, 'overtime', overtimeId));
    console.log('残業記録を削除しました！ID:', overtimeId);
    return { success: true };
  } catch (error) {
    console.error('残業記録削除エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserOvertimeRecords(userEmail, selectedMonth = null) {
  try {
    const q = query(
      collection(db, 'overtime'),
      where('employeeEmail', '==', userEmail)
    );

    const querySnapshot = await getDocs(q);
    const records = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      if (selectedMonth) {
        const recordDate = data.date;
        const monthPrefix = selectedMonth;

        if (recordDate && recordDate.startsWith(monthPrefix)) {
          records.push({
            id: doc.id,
            ...data
          });
        }
      } else {
        records.push({
          id: doc.id,
          ...data
        });
      }
    });

    records.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });

    return { success: true, data: records };
  } catch (error) {
    console.error('ユーザー残業記録取得エラー:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getOvertimeStats(userEmail, startDate, endDate) {
  try {
    const q = query(
      collection(db, 'overtime'),
      where('employeeEmail', '==', userEmail)
    );

    const querySnapshot = await getDocs(q);
    const records = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      if (data.date >= startDate && data.date <= endDate) {
        records.push({
          id: doc.id,
          ...data
        });
      }
    });

    records.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });

    const totalHours = records.reduce((sum, r) => sum + (r.hours || 0), 0);
    const weekdayHours = records.filter(r => r.overtimeType === 'weekday').reduce((sum, r) => sum + (r.hours || 0), 0);
    const weekendHours = records.filter(r => r.overtimeType === 'weekend').reduce((sum, r) => sum + (r.hours || 0), 0);
    const holidayHours = records.filter(r => r.overtimeType === 'holiday').reduce((sum, r) => sum + (r.hours || 0), 0);

    return {
      success: true,
      data: {
        records,
        stats: {
          totalHours,
          weekdayHours,
          weekendHours,
          holidayHours,
          totalRecords: records.length
        }
      }
    };
  } catch (error) {
    console.error('残業統計取得エラー:', error);
    return { success: false, error: error.message };
  }
}


// ============================================================================
// HEALTH CHECK OPERATIONS (健康診断管理)
// ============================================================================

export async function getHealthChecks() {
  try {
    const querySnapshot = await getDocs(collection(db, 'healthChecks'));
    const checks = [];

    querySnapshot.forEach((doc) => {
      checks.push({
        id: doc.id,
        ...doc.data()
      });
    });

    checks.sort((a, b) => {
      if (!a.scheduledDate) return 1;
      if (!b.scheduledDate) return -1;
      return b.scheduledDate.localeCompare(a.scheduledDate);
    });

    console.log('健康診断を取得しました:', checks.length);
    return { success: true, data: checks };
  } catch (error) {
    console.error('健康診断取得エラー:', error);
    return { success: false, error: error.message, data: [] };
  }
}

// 予定されている健康診断sayısını getir (Optimized)
export async function getUpcomingHealthCheckCount() {
  try {
    const q = query(
      collection(db, 'healthChecks'),
      where('status', '==', 'scheduled')
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('予定されている健康診断取得エラー:', error);
    return 0;
  }
}

// 全ての健康診断sayısını getir (Optimized)
export async function getTotalHealthCheckCount() {
  try {
    const coll = collection(db, 'healthChecks');
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
  } catch (error) {
    console.error('全健康診断取得エラー:', error);
    return 0;
  }
}

export async function addHealthCheck(healthCheckData) {
  try {
    const now = new Date().toISOString();

    const docRef = await addDoc(collection(db, 'healthChecks'), {
      employeeId: healthCheckData.employeeId,
      employeeName: healthCheckData.employeeName,
      employeeEmail: healthCheckData.employeeEmail,
      scheduledDate: healthCheckData.scheduledDate,
      completedDate: healthCheckData.completedDate || null,
      status: healthCheckData.status || 'scheduled',
      reportSubmitted: healthCheckData.reportSubmitted || false,
      notes: healthCheckData.notes || '',
      year: healthCheckData.year || new Date().getFullYear(),
      createdAt: now,
      updatedAt: now
    });

    console.log('健康診断を追加しました！ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('健康診断の追加エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function updateHealthCheck(healthCheckId, updates) {
  try {
    const now = new Date().toISOString();
    const healthCheckRef = doc(db, 'healthChecks', healthCheckId);

    await updateDoc(healthCheckRef, {
      ...updates,
      updatedAt: now
    });

    console.log('健康診断を更新しました！ID:', healthCheckId);
    return { success: true };
  } catch (error) {
    console.error('健康診断の更新エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteHealthCheck(healthCheckId) {
  try {
    await deleteDoc(doc(db, 'healthChecks', healthCheckId));
    console.log('健康診断を削除しました！ID:', healthCheckId);
    return { success: true };
  } catch (error) {
    console.error('健康診断削除エラー:', error);
    return { success: false, error: error.message };
  }
}


// ============================================================================
// LEGACY FUNCTIONS (互換性のための旧関数)
// ============================================================================

export async function submitLeaveRequest(leaveData) {
  return await addLeaveRequest(leaveData);
}

export async function updateLeaveRequestStatus(id, status, approvedBy = null, rejectionReason = null) {
  return await updateLeaveRequest(id, {
    status,
    approvedBy,
    rejectionReason
  });
}


// ============================================================================
// HOLIDAY CALENDAR OPERATIONS (祝日カレンダー)
// ============================================================================

export async function getHolidays() {
  try {
    const querySnapshot = await getDocs(collection(db, 'holidays'));
    const holidays = [];

    querySnapshot.forEach((doc) => {
      holidays.push({
        id: doc.id,
        ...doc.data()
      });
    });

    holidays.sort((a, b) => a.date.localeCompare(b.date));

    console.log('休日を取得しました:', holidays.length);
    return { success: true, data: holidays };
  } catch (error) {
    console.error('休日取得エラー:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getUpcomingHolidaysCount() {
  try {
    const currentYear = new Date().getFullYear();
    const q = query(
      collection(db, 'holidays'),
      where('year', '==', currentYear)
    );
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('年間の祝日取得エラー:', error);
    return 0;
  }
}

export async function addHoliday(holidayData) {
  try {
    const now = new Date().toISOString();

    const docRef = await addDoc(collection(db, 'holidays'), {
      date: holidayData.date,
      name: holidayData.name,
      type: holidayData.type,
      description: holidayData.description || '',
      year: holidayData.year,
      createdBy: holidayData.createdBy,
      createdAt: now,
      updatedAt: now
    });

    console.log('休日を追加しました！ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('休日追加エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function updateHoliday(holidayId, updates) {
  try {
    const now = new Date().toISOString();
    const holidayRef = doc(db, 'holidays', holidayId);

    await updateDoc(holidayRef, {
      ...updates,
      updatedAt: now
    });

    console.log('休日を更新しました！ID:', holidayId);
    return { success: true };
  } catch (error) {
    console.error('休日更新エラー:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteHoliday(holidayId) {
  try {
    await deleteDoc(doc(db, 'holidays', holidayId));
    console.log('休日を削除しました！ID:', holidayId);
    return { success: true };
  } catch (error) {
    console.error('休日削除エラー:', error);
    return { success: false, error: error.message };
  }
}