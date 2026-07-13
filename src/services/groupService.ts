import { supabase, isSupabaseConfigured } from '../supabase';
import type { Match } from '../utils/matching';

export interface GroupData {
  id: string;
  groupName: string;
  leaderName: string;
  password: string; // Admin password (e.g. "행복한 사자")
  createdAt: Date;
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

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('manitto_groups')
        .select('id')
        .eq('group_name', trimmedGroup)
        .eq('leader_name', trimmedLeader);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error('Supabase checkGroupDuplicate error:', error);
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

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('manitto_groups')
        .insert([
          {
            group_name: trimmedGroup,
            leader_name: trimmedLeader,
            password,
            is_matched: false,
            names: [],
            matches: [],
          },
        ])
        .select()
        .single();

      if (error) throw error;
      if (data) return data.id;
    } catch (error) {
      console.error('Supabase createGroup error, falling back to LocalStorage:', error);
    }
  }

  // LocalStorage fallback
  const localGroups = getLocalGroups();
  const generatedId = Math.random().toString(36).substring(2, 11); // Random alphanumeric ID
  const localGroup: GroupData = {
    id: generatedId,
    groupName: trimmedGroup,
    leaderName: trimmedLeader,
    password,
    createdAt: new Date(),
    isMatched: false,
    names: [],
    matches: [],
  };
  localGroups.push(localGroup);
  saveLocalGroups(localGroups);
  return generatedId;
}

/**
 * Fetches a group by ID.
 */
export async function getGroup(groupId: string): Promise<GroupData | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      // Validate that groupId is a valid UUID before sending query to PostgreSQL
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(groupId)) {
        const { data, error } = await supabase
          .from('manitto_groups')
          .select('*')
          .eq('id', groupId)
          .single();

        if (error) throw error;
        if (data) {
          return {
            id: data.id,
            groupName: data.group_name,
            leaderName: data.leader_name,
            password: data.password,
            createdAt: new Date(data.created_at),
            isMatched: data.is_matched || false,
            names: data.names || [],
            matches: data.matches || [],
          };
        }
      }
    } catch (error) {
      console.error('Supabase getGroup error, checking LocalStorage:', error);
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

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('manitto_groups')
        .update({ names: cleanNames })
        .eq('id', groupId);

      if (error) throw error;
      return;
    } catch (error) {
      console.error('Supabase updateGroupNames error, writing to LocalStorage:', error);
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
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('manitto_groups')
        .update({
          matches,
          is_matched: true,
        })
        .eq('id', groupId);

      if (error) throw error;
      return;
    } catch (error) {
      console.error('Supabase saveGroupMatches error, writing to LocalStorage:', error);
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

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('manitto_groups')
        .select('*')
        .eq('group_name', trimmedGroup)
        .eq('leader_name', trimmedLeader)
        .eq('password', trimmedPassword)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        return {
          id: data.id,
          groupName: data.group_name,
          leaderName: data.leader_name,
          password: data.password,
          createdAt: new Date(data.created_at),
          isMatched: data.is_matched || false,
          names: data.names || [],
          matches: data.matches || [],
        };
      }
    } catch (error) {
      console.error('Supabase findGroupForAdmin error:', error);
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
