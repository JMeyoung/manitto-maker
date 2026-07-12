import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import type { Match } from '../utils/matching';

export interface GroupData {
  id: string;
  groupName: string;
  leaderName: string;
  password: string; // Admin password (e.g. "행복한 사자")
  createdAt: any;
  isMatched: boolean;
  names: string[];
  matches: Match[];
}

const LOCAL_STORAGE_KEY = 'manitto_groups';

// Helper for LocalStorage operations
function getLocalGroups(): GroupData[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveLocalGroups(groups: GroupData[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(groups));
}

/**
 * Checks if a group with the same groupName and leaderName already exists.
 */
export async function checkGroupDuplicate(
  groupName: string,
  leaderName: string
): Promise<boolean> {
  const trimmedGroup = groupName.trim();
  const trimmedLeader = leaderName.trim();

  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, 'groups'),
        where('groupName', '==', trimmedGroup),
        where('leaderName', '==', trimmedLeader)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Firestore checkGroupDuplicate error:', error);
      // Fallback to local check if db errors out
    }
  }

  // LocalStorage check
  const localGroups = getLocalGroups();
  return localGroups.some(
    (g) =>
      g.groupName.toLowerCase() === trimmedGroup.toLowerCase() &&
      g.leaderName.toLowerCase() === trimmedLeader.toLowerCase()
  );
}

/**
 * Creates a new group and returns its ID.
 */
export async function createGroup(
  groupName: string,
  leaderName: string,
  password: string
): Promise<string> {
  const trimmedGroup = groupName.trim();
  const trimmedLeader = leaderName.trim();

  const newGroupPayload = {
    groupName: trimmedGroup,
    leaderName: trimmedLeader,
    password,
    createdAt: new Date(),
    isMatched: false,
    names: [],
    matches: [],
  };

  if (isFirebaseConfigured && db) {
    try {
      const docRef = await addDoc(collection(db, 'groups'), newGroupPayload);
      return docRef.id;
    } catch (error) {
      console.error('Firestore createGroup error, falling back to LocalStorage:', error);
    }
  }

  // LocalStorage fallback
  const localGroups = getLocalGroups();
  const generatedId = Math.random().toString(36).substring(2, 11); // Random alphanumeric ID
  const localGroup: GroupData = {
    id: generatedId,
    ...newGroupPayload,
  };
  localGroups.push(localGroup);
  saveLocalGroups(localGroups);
  return generatedId;
}

/**
 * Fetches a group by ID.
 */
export async function getGroup(groupId: string): Promise<GroupData | null> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'groups', groupId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Convert Firestore Timestamp to Date object if needed
        let createdAtDate = new Date();
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          createdAtDate = data.createdAt.toDate();
        } else if (data.createdAt) {
          createdAtDate = new Date(data.createdAt);
        }
        return {
          id: docSnap.id,
          groupName: data.groupName,
          leaderName: data.leaderName,
          password: data.password,
          createdAt: createdAtDate,
          isMatched: data.isMatched || false,
          names: data.names || [],
          matches: data.matches || [],
        };
      }
    } catch (error) {
      console.error('Firestore getGroup error, checking LocalStorage:', error);
    }
  }

  // LocalStorage check
  const localGroups = getLocalGroups();
  const found = localGroups.find((g) => g.id === groupId);
  return found || null;
}

/**
 * Updates the participant names list of a group.
 */
export async function updateGroupNames(
  groupId: string,
  names: string[]
): Promise<void> {
  const cleanNames = names.map((n) => n.trim()).filter(Boolean);

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'groups', groupId);
      await updateDoc(docRef, { names: cleanNames });
      return;
    } catch (error) {
      console.error('Firestore updateGroupNames error, writing to LocalStorage:', error);
    }
  }

  // LocalStorage update
  const localGroups = getLocalGroups();
  const groupIndex = localGroups.findIndex((g) => g.id === groupId);
  if (groupIndex !== -1) {
    localGroups[groupIndex].names = cleanNames;
    saveLocalGroups(localGroups);
  }
}

/**
 * Saves generated Manitto matches and updates isMatched flag.
 */
export async function saveGroupMatches(
  groupId: string,
  matches: Match[]
): Promise<void> {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'groups', groupId);
      await updateDoc(docRef, {
        matches,
        isMatched: true,
      });
      return;
    } catch (error) {
      console.error('Firestore saveGroupMatches error, writing to LocalStorage:', error);
    }
  }

  // LocalStorage update
  const localGroups = getLocalGroups();
  const groupIndex = localGroups.findIndex((g) => g.id === groupId);
  if (groupIndex !== -1) {
    localGroups[groupIndex].matches = matches;
    localGroups[groupIndex].isMatched = true;
    saveLocalGroups(localGroups);
  }
}

/**
 * Admin search for a group.
 */
export async function findGroupForAdmin(
  groupName: string,
  leaderName: string,
  adminPassword: string
): Promise<GroupData | null> {
  const trimmedGroup = groupName.trim();
  const trimmedLeader = leaderName.trim();
  const trimmedPassword = adminPassword.trim();

  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, 'groups'),
        where('groupName', '==', trimmedGroup),
        where('leaderName', '==', trimmedLeader),
        where('password', '==', trimmedPassword)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        let createdAtDate = new Date();
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          createdAtDate = data.createdAt.toDate();
        }
        return {
          id: docSnap.id,
          groupName: data.groupName,
          leaderName: data.leaderName,
          password: data.password,
          createdAt: createdAtDate,
          isMatched: data.isMatched || false,
          names: data.names || [],
          matches: data.matches || [],
        };
      }
    } catch (error) {
      console.error('Firestore findGroupForAdmin error:', error);
    }
  }

  // LocalStorage fallback
  const localGroups = getLocalGroups();
  const found = localGroups.find(
    (g) =>
      g.groupName.toLowerCase() === trimmedGroup.toLowerCase() &&
      g.leaderName.toLowerCase() === trimmedLeader.toLowerCase() &&
      g.password.toLowerCase() === trimmedPassword.toLowerCase()
  );
  return found || null;
}
