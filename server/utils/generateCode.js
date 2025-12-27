/**
 * Generate a random 6-character alphanumeric share code.
 * Uses uppercase letters and numbers for easy sharing.
 */
const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default generateCode;
