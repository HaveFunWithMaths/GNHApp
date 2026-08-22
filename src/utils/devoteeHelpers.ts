import { Devotee, FamilyMember } from '../types';

/**
 * Clean phone number to 10-digit numerical string
 */
export function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10);
}

/**
 * Normalizes a single family member entry into a FamilyMember object
 */
export function normalizeFamilyMember(member: string | FamilyMember): FamilyMember {
  if (typeof member === 'string') {
    return {
      name: member.trim(),
      phone_number: undefined,
    };
  }
  return {
    name: (member.name || '').trim(),
    phone_number: member.phone_number ? cleanPhoneNumber(member.phone_number) : undefined,
  };
}

/**
 * Normalizes all family members of a devotee into a FamilyMember[] list
 */
export function normalizeFamilyMembers(devotee?: Devotee | null): FamilyMember[] {
  if (!devotee || !devotee.family_members || !Array.isArray(devotee.family_members)) {
    return [];
  }
  return devotee.family_members.map(normalizeFamilyMember).filter(m => m.name.length > 0);
}

/**
 * Returns an array of pure names of all family members
 */
export function getFamilyMemberNames(devotee?: Devotee | null): string[] {
  if (!devotee) return [];
  const normalized = normalizeFamilyMembers(devotee);
  if (normalized.length === 0 && devotee.group_name) {
    return [devotee.group_name];
  }
  return normalized.map(m => m.name);
}

/**
 * Returns the primary family member or devotee display name
 */
export function getPrimaryFamilyMemberName(devotee?: Devotee | null): string {
  if (!devotee) return '';
  const names = getFamilyMemberNames(devotee);
  return names[0] || devotee.group_name;
}

/**
 * Returns all valid 10-digit phone numbers registered for this devotee
 * (primary phone + any family member phones)
 */
export function getAllDevoteePhones(devotee: Devotee): string[] {
  const phones = new Set<string>();
  const primaryClean = cleanPhoneNumber(devotee.phone_number);
  if (primaryClean.length === 10) {
    phones.add(primaryClean);
  }

  const members = normalizeFamilyMembers(devotee);
  members.forEach(m => {
    if (m.phone_number) {
      const clean = cleanPhoneNumber(m.phone_number);
      if (clean.length === 10) {
        phones.add(clean);
      }
    }
  });

  return Array.from(phones);
}

export interface DevoteePhoneMatch {
  devotee: Devotee;
  isPrimary: boolean;
  matchedMemberName?: string;
  matchedPhone: string;
}

/**
 * Finds a devotee matching the provided phone number.
 * Checks primary phone numbers first, then checks each family member's registered phone number.
 */
export function findDevoteeByPhone(devotees: Devotee[], inputPhone: string): DevoteePhoneMatch | null {
  const clean = cleanPhoneNumber(inputPhone);
  if (clean.length !== 10) {
    return null;
  }

  // 1. Check exact match on primary phone number
  for (const devotee of devotees) {
    if (cleanPhoneNumber(devotee.phone_number) === clean) {
      const members = normalizeFamilyMembers(devotee);
      const matchingMember = members.find(m => cleanPhoneNumber(m.phone_number) === clean);
      return {
        devotee,
        isPrimary: true,
        matchedMemberName: matchingMember ? matchingMember.name : undefined,
        matchedPhone: clean,
      };
    }
  }

  // 2. Check match across all family member phone numbers
  for (const devotee of devotees) {
    const members = normalizeFamilyMembers(devotee);
    for (const member of members) {
      if (member.phone_number && cleanPhoneNumber(member.phone_number) === clean) {
        return {
          devotee,
          isPrimary: false,
          matchedMemberName: member.name,
          matchedPhone: clean,
        };
      }
    }
  }

  return null;
}

/**
 * Formats a devotee's family members into a human-readable string.
 * e.g. "Ram Das (9876543201), Sita Devi (9876543299), Laxman Das"
 */
export function formatDevoteeFamilyDisplay(devotee?: Devotee | null, includePhones: boolean = false): string {
  if (!devotee) return '';
  const members = normalizeFamilyMembers(devotee);
  if (members.length === 0) return devotee.group_name || '';

  if (!includePhones) {
    return members.map(m => m.name).join(', ');
  }

  return members
    .map(m => {
      if (m.phone_number && cleanPhoneNumber(m.phone_number).length === 10) {
        return `${m.name} (${cleanPhoneNumber(m.phone_number)})`;
      }
      return m.name;
    })
    .join(', ');
}
