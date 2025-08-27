/**
 * Safe JSON parsing utility that handles empty responses and error cases
 * @param {Response} res - Fetch response object
 * @returns {Promise<any>} - Parsed JSON data
 * @throws {Error} - With descriptive error message
 */
export async function safeJson(res) {
  const text = await res.text(); // works for JSON, HTML, empty, anything
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text?.slice(0, 200) || "<empty>"}`);
  }
  
  if (!text) {
    throw new Error("Empty response body");
  }
  
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON: ${text.slice(0, 200)}`);
  }
}