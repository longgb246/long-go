
import { GoogleGenAI, Type } from "@google/genai";
import { Stone, BoardSize, Point, AIHint } from "../types";
import { boardToCoordinates, coordinatesToBoard } from "../logic/goEngine";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIMove = async (
  board: Stone[][],
  size: BoardSize,
  player: Stone,
  isHint: boolean = false
): Promise<AIHint | null> => {
  // 将棋盘转化为 AI 可理解的字符串
  const boardStr = board.map((row, y) => {
    return row.map((cell, x) => {
      if (cell === Stone.BLACK) return `B(${boardToCoordinates(x, y, size)})`;
      if (cell === Stone.WHITE) return `W(${boardToCoordinates(x, y, size)})`;
      return null;
    }).filter(Boolean).join(", ");
  }).filter(s => s !== "").join("; ");

  const playerColor = player === Stone.BLACK ? "Black" : "White";

  const prompt = `
    You are a world-class Go Engine (similar to KataGo). 
    Board Size: ${size}x${size}
    Current Player: ${playerColor}
    Stones: ${boardStr || "Empty board"}

    Task: Perform a deep professional analysis.
    1. Find the single best move (Standard notation like Q16).
    2. Calculate current Win Rate (0-100) for ${playerColor}.
    3. Estimate Score Lead (positive means ${playerColor} is leading).
    4. Provide a professional strategic reason (e.g., "Miai", "Tesuji", "Influence", "Sente").

    Return ONLY JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // 使用更强的 Pro 模型模拟引擎
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coordinate: { type: Type.STRING },
            winRate: { type: Type.NUMBER },
            scoreLead: { type: Type.NUMBER },
            reason: { type: Type.STRING }
          },
          required: ["coordinate", "winRate", "scoreLead", "reason"]
        }
      }
    });

    const data = JSON.parse(response.text);
    const point = coordinatesToBoard(data.coordinate, size);
    if (point) {
      return { 
        ...point, 
        reason: data.reason,
        winRate: data.winRate,
        scoreLead: data.scoreLead
      };
    }
  } catch (error) {
    console.error("Engine API Error:", error);
  }
  return null;
};
