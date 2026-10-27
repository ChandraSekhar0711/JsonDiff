export const SAMPLE_BASELINE_OBJ = {
  id: 101,
  name: "Chandu",
  email: "chandu@example.com",
  age: 26,
  role: "frontend-engineer",
  profile: {
    city: "Hyderabad",
    country: "India",
    skills: ["React", "JavaScript", "CSS"]
  },
  metrics: {
    commits: 412,
    rating: 4.9
  },
  updatedAt: "2026-03-01T10:00:00Z"
};

export const SAMPLE_UPDATED_OBJ = {
  id: 101,
  name: "Chandu Rao",
  // email removed
  age: "26", // Type changed: number -> string
  role: "frontend-engineer",
  profile: {
    city: "Bengaluru", // Modified
    country: "India",
    skills: ["React", "TypeScript", "Tailwind"] // Array item changes
  },
  metrics: {
    commits: 430,
    rating: 4.9
  },
  active: true, // Added
  updatedAt: "2026-03-15T14:32:00Z" // Can be ignored
};

export const SAMPLE_BASELINE = JSON.stringify(SAMPLE_BASELINE_OBJ, null, 2);
export const SAMPLE_UPDATED = JSON.stringify(SAMPLE_UPDATED_OBJ, null, 2);

export const CHANGE_TYPES = {
  ADDED: 'added',
  REMOVED: 'removed',
  MODIFIED: 'modified',
  TYPE_CHANGED: 'type_changed'
};

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
