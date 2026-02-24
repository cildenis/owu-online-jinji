const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCollections() {
    console.log('--- Checking JOB collections ---');

    const jobsSnapshot = await getDocs(collection(db, 'jobs'));
    console.log(`'jobs' collection: ${jobsSnapshot.size} docs`);
    jobsSnapshot.forEach(doc => console.log(` - ID: ${doc.id}, Status: ${doc.data().status}`));

    const jobPostingsSnapshot = await getDocs(collection(db, 'jobPostings'));
    console.log(`'jobPostings' collection: ${jobPostingsSnapshot.size} docs`);

    console.log('\n--- Checking EMPLOYEES collection ---');
    const employeesSnapshot = await getDocs(collection(db, 'employees'));
    console.log(`'employees' collection: ${employeesSnapshot.size} docs`);
    employeesSnapshot.forEach(doc => console.log(` - ID: ${doc.id}, Name: ${doc.data().fullName}`));

    console.log('\n--- Checking APPLICATIONS collection ---');
    const appsSnapshot = await getDocs(collection(db, 'applications'));
    console.log(`'applications' collection: ${appsSnapshot.size} docs`);
    appsSnapshot.forEach(doc => console.log(` - ID: ${doc.id}, Status: ${doc.data().status}`));

    console.log('\n--- Checking OVERTIME collection ---');
    const overtimeSnapshot = await getDocs(collection(db, 'overtime'));
    console.log(`'overtime' collection: ${overtimeSnapshot.size} docs`);
    overtimeSnapshot.forEach(doc => console.log(` - ID: ${doc.id}, Status: ${doc.data().status}, User: ${doc.data().employeeName}`));

    console.log('\n--- Checking HEALTH CHECKS collection ---');
    const healthSnapshot = await getDocs(collection(db, 'healthChecks'));
    console.log(`'healthChecks' collection: ${healthSnapshot.size} docs`);
    healthSnapshot.forEach(doc => console.log(` - ID: ${doc.id}, Status: ${doc.data().status}, Date: ${doc.data().scheduledDate}`));
}

checkCollections().catch(console.error);
