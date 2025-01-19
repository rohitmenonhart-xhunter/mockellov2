import { Button } from "@/components/button/Button";
import { LoadingSVG } from "@/components/button/LoadingSVG";
import { SettingsDropdown } from "@/components/playground/SettingsDropdown";
import { useConfig } from "@/hooks/useConfig";
import { ConnectionState } from "livekit-client";
import { ReactNode, useEffect, useState } from "react";

type PlaygroundHeader = {
  logo?: ReactNode;
  title?: ReactNode;
  githubLink?: string;
  height: number;
  accentColor: string;
  connectionState: ConnectionState;
  onConnectClicked: () => void;
  timeLeft?: number;
};

export const PlaygroundHeader = ({
  logo,
  title,
  githubLink,
  accentColor,
  height,
  onConnectClicked,
  connectionState,
  timeLeft = 0,
}: PlaygroundHeader) => {
  const { config } = useConfig();
  const [sessionId, setSessionId] = useState('');
  const [hasAttemptedConnect, setHasAttemptedConnect] = useState(false);

  const renderButton = () => {
    if (connectionState === ConnectionState.Connecting) {
      return <LoadingSVG />;
    }
    if (connectionState === ConnectionState.Connected) {
      return "Note: session closing soon";
    }
    return sessionId ? "Connect" : "Enter Session ID";
  };

  const isConnecting = connectionState === ConnectionState.Connecting;
  const isConnected = connectionState === ConnectionState.Connected;
  const isDisconnected = connectionState === ConnectionState.Disconnected;

  const shouldShowButton = 
    (isDisconnected && !hasAttemptedConnect) || (isConnected && timeLeft <= 300);

  // Auto-click when button appears for feedback generation only
  useEffect(() => {
    if (shouldShowButton && isConnected && timeLeft <= 300) {
      console.log("Generate Feedback button appeared, auto-clicking in 15 seconds");
      const timer = setTimeout(() => {
        console.log("Auto-clicking Generate Feedback button");
        onConnectClicked();
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [shouldShowButton, isConnected, timeLeft, onConnectClicked]);

  const handleConnect = () => {
    if (sessionId && !hasAttemptedConnect) {
      localStorage.setItem('interviewSessionId', sessionId);
      setHasAttemptedConnect(true);
      onConnectClicked();
    }
  };

  // Reset hasAttemptedConnect when disconnected
  useEffect(() => {
    if (isDisconnected) {
      setHasAttemptedConnect(false);
    }
  }, [isDisconnected]);

  return (
    <div
      className={`flex gap-4 pt-4 text-${accentColor}-500 justify-between items-center shrink-0`}
      style={{
        height: height + "px",
      }}
    >
      <div className="flex items-center gap-3 basis-2/3">
        <div className="lg:basis-1/2 lg:text-center text-xs lg:text-base lg:font-semibold text-white">
          {title}
        </div>
      </div>
      <div className="flex basis-1/3 justify-end items-center gap-4">
        {config.settings.editable && <SettingsDropdown />}
        {shouldShowButton && isDisconnected && (
          <>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Enter Session ID"
              className="text-white text-sm bg-gray-900 border border-gray-800 rounded-sm px-3 py-2 focus:border-[#BE185D] focus:outline-none"
              disabled={isConnecting || hasAttemptedConnect}
            />
            <Button
              accentColor={accentColor}
              disabled={isConnecting || !sessionId || hasAttemptedConnect}
              onClick={handleConnect}
            >
              {renderButton()}
            </Button>
          </>
        )}
        {shouldShowButton && isConnected && (
          <Button
            accentColor="red"
            onClick={onConnectClicked}
          >
            {renderButton()}
          </Button>
        )}
      </div>
    </div>
  );
};



