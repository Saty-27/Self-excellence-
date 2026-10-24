/**
 * Books Module Feature Flag Configuration
 *
 * Controls availability of public book routes, order creation,
 * payment proof submission, and admin book management.
 * Defaults to true. Set BOOKS_ENABLED=false in backend/.env to disable.
 */
export const isBooksEnabled = () => {
  const envVal = process.env.BOOKS_ENABLED;
  if (envVal === undefined || envVal === null || envVal === "") return true;
  return String(envVal).toLowerCase() !== "false" && String(envVal) !== "0";
};
