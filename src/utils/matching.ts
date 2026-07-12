import wordData from './words.json';

export interface Match {
  giver: string;
  receiver: string;
  password: string; // 4-digit code generated for individual result lookup
}

// Generate admin password (combines random adjective and random animal)
export function generateAdminPassword(): string {
  const adjs = wordData.adjectives;
  const animals = wordData.animals;
  
  if (!adjs || !animals || adjs.length === 0 || animals.length === 0) {
    return '비밀 산타';
  }

  const randAdj = adjs[Math.floor(Math.random() * adjs.length)];
  const randAnimal = animals[Math.floor(Math.random() * animals.length)];
  return `${randAdj} ${randAnimal}`;
}

// Generate a random 4-digit numeric code
export function generateParticipantPassword(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Fisher-Yates array shuffle (creates a new array copy)
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Performs a random cyclic matching algorithm (A -> B -> C -> A).
 * This ensures:
 * 1. No one is matched to themselves.
 * 2. Everyone is both a giver and a receiver exactly once.
 * 3. The entire group forms a single continuous loop/cycle (more fun, no separate loops).
 */
export function performCyclicMatching(names: string[]): Match[] {
  const cleanNames = names.map(n => n.trim()).filter(Boolean);
  
  if (cleanNames.length < 3) {
    throw new Error('마니또 매칭을 위해서는 최소 3명의 참가자가 필요합니다.');
  }

  // 1. Shuffle the names randomly to randomize the cycle order
  const shuffled = shuffleArray(cleanNames);
  const n = shuffled.length;
  
  // 2. Link each participant to the next one to create a single cycle
  const matches: Match[] = [];
  const generatedPasswords = new Set<string>();

  for (let i = 0; i < n; i++) {
    const giver = shuffled[i];
    const receiver = shuffled[(i + 1) % n]; // Wraps around for the last element
    
    // Generate a unique 4-digit password for each match
    let password = generateParticipantPassword();
    while (generatedPasswords.has(password)) {
      password = generateParticipantPassword();
    }
    generatedPasswords.add(password);

    matches.push({
      giver,
      receiver,
      password,
    });
  }

  return matches;
}
