import { useConfig } from "@/hooks/useConfig";
import { CLOUD_ENABLED, CloudConnect } from "../cloud/CloudConnect";
import { Button } from "./button/Button";
import { useState } from "react";
import { ConnectionMode } from "@/hooks/useConnection";

type PlaygroundConnectProps = {
  accentColor: string;
  onConnectClicked: (mode: ConnectionMode) => void;
};

export const PlaygroundConnect = ({
  accentColor,
  onConnectClicked,
}: PlaygroundConnectProps) => {
  const [sessionId, setSessionId] = useState('');
  const copy = "Enter your session ID to begin your interview";

  const handleConnect = () => {
    if (!sessionId) {
      return;
    }
    // Store the session ID in localStorage before connecting
    localStorage.setItem('interviewSessionId', sessionId);
    // Always use env mode to ensure proper token generation
    onConnectClicked("env");
  };

  return (
    <div className="flex left-0 top-0 w-full h-full bg-black/80 items-center justify-center text-center gap-2">
      <div className="min-h-[540px]">
        <div className="flex flex-col bg-gray-950 w-full max-w-[480px] rounded-lg text-white border border-gray-900">
          <div className="flex flex-col gap-2">
            <div className="px-10 space-y-2 py-6">
              <h1 className="text-2xl">Connect to Interview</h1>
              <p className="text-sm text-gray-500">{copy}</p>
            </div>
          </div>
          <div className="flex flex-col bg-gray-900/30 flex-grow p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-400 text-left">Enter Session ID:</label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Enter your session ID"
                  className="text-white text-sm bg-gray-900 border border-gray-800 rounded-sm px-3 py-2 focus:border-[#BE185D] focus:outline-none"
                />
              </div>
              
              <Button
                accentColor={accentColor}
                className="w-full"
                disabled={!sessionId}
                onClick={handleConnect}
              >
                {sessionId ? 'Start Interview' : 'Please enter session ID'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
