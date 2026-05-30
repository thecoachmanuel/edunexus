export const scope = (schoolId: string, extra: object = {}) => ({
  school: schoolId,
  ...extra,
});
