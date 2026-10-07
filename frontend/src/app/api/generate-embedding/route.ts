import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emp_code, photos } = body;

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json(
        { success: false, error: "No photos provided for face analysis." },
        { status: 400 }
      );
    }

    // Resolve python executable and script path
    // Project root is one level above frontend/
    const projectRoot = path.resolve(process.cwd(), "..");
    const localProjectRoot = process.cwd();

    let pythonExe = "python";
    const venvPythonRoot = path.join(projectRoot, "venv", "Scripts", "python.exe");
    const venvPythonLocal = path.join(localProjectRoot, "..", "venv", "Scripts", "python.exe");

    if (fs.existsSync(venvPythonRoot)) {
      pythonExe = venvPythonRoot;
    } else if (fs.existsSync(venvPythonLocal)) {
      pythonExe = venvPythonLocal;
    }

    let scriptPath = path.join(projectRoot, "process_photos_embedding.py");
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.join(localProjectRoot, "..", "process_photos_embedding.py");
    }

    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.join(process.cwd(), "process_photos_embedding.py");
    }

    // Execute Python processor
    const payload = JSON.stringify({
      emp_code: emp_code || "",
      photos,
      save_supabase: true,
    });

    const result = await new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
      const proc = spawn(pythonExe, [scriptPath]);
      let stdoutData = "";
      let stderrData = "";

      proc.stdin.write(payload);
      proc.stdin.end();

      proc.stdout.on("data", (chunk) => {
        stdoutData += chunk.toString();
      });

      proc.stderr.on("data", (chunk) => {
        stderrData += chunk.toString();
      });

      proc.on("close", (code) => {
        if (code === 0 && stdoutData.trim()) {
          try {
            let jsonString = "";
            const startMarker = "---RESULT_JSON_START---";
            const endMarker = "---RESULT_JSON_END---";
            
            if (stdoutData.includes(startMarker) && stdoutData.includes(endMarker)) {
              jsonString = stdoutData.split(startMarker)[1].split(endMarker)[0].trim();
            } else {
              const lines = stdoutData.trim().split("\n");
              for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].trim().startsWith("{") && lines[i].trim().endsWith("}")) {
                  jsonString = lines[i].trim();
                  break;
                }
              }
            }

            if (jsonString) {
              const parsed = JSON.parse(jsonString);
              resolve({ success: parsed.success, data: parsed });
            } else {
              resolve({ success: false, error: "No JSON payload found in output: " + stdoutData });
            }
          } catch (e: any) {
            resolve({ success: false, error: "Failed to parse Python output: " + e.message });
          }
        } else {
          resolve({
            success: false,
            error: stderrData || stdoutData || `Process exited with code ${code}`,
          });
        }
      });

      proc.on("error", (err) => {
        resolve({
          success: false,
          error: `Failed to spawn Python (${pythonExe}): ${err.message}`,
        });
      });
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.data?.error || result.error || "Face processing failed.",
          logs: result.data?.logs || [result.error || "Python execution failed"],
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emp_code: result.data.emp_code,
      embedding_base64: result.data.embedding_base64,
      photos_processed: result.data.photos_processed,
      valid_faces_count: result.data.valid_faces_count,
      det_scores: result.data.det_scores,
      logs: result.data.logs,
      message: `Successfully extracted 512-d InsightFace ArcFace biometric vector from ${result.data.valid_faces_count} photo(s)!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}
