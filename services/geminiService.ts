import { GoogleGenAI } from "@google/genai";
import type { AnalysisResult } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // This is a placeholder for development. The build environment will inject the key.
  // In a real scenario, you'd want to handle this more gracefully, but per instructions, we assume it's present.
  console.warn("API_KEY is not set. Please ensure it is available in the environment variables.");
}


const cleanJsonString = (jsonStr: string): string => {
  // The model might return the JSON string wrapped in markdown backticks.
  // This function removes them.
  const regex = /```json\n?([\s\S]*?)\n?```/;
  const match = jsonStr.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return jsonStr.trim();
};

export const analyzeFace = async (
  base64Image: string,
  mimeType: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const textPart = {
    text: `Please analyze the attached image, which contains a photograph of a person's face. Your task is to estimate their age and gender. Present your findings in a structured JSON format with two keys: "estimated_gender" (string) and "estimated_age" (integer). Please ensure your response adheres strictly to this JSON structure.`
  };

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType,
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts: [imagePart, textPart] },
    });

    const cleanedJson = cleanJsonString(response.text);
    const result: AnalysisResult = JSON.parse(cleanedJson);
    return result;

  } catch (error) {
    console.error("Error analyzing image with Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to analyze image. API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred during image analysis.");
  }
};