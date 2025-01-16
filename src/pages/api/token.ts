import { NextApiRequest, NextApiResponse } from "next";
import { generateRandomAlphanumeric } from "@/lib/util";

import { AccessToken } from "livekit-server-sdk";
import type { AccessTokenOptions, VideoGrant } from "livekit-server-sdk";
import { TokenResult } from "../../lib/types";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

const createToken = async (
  { identity, metadata }: { identity: string; metadata?: string },
  grant: VideoGrant
) => {
  const at = new AccessToken(apiKey, apiSecret, { identity, metadata });
  at.addGrant(grant);
  return await Promise.resolve(at.toJwt());
};

// Define valid roles
const validRoles = [
  'fullstack',
  'devops',
  'frontend',
  'backend',
  'software',
  'data',
  'ml',
  'cloud',
  'sysadmin',
  'qa',
  'electronics',
  'electrical',
  'mechanical',
  'civil',
  'product',
  'project',
  'uiux',
  'dba',
  'security',
  'network'
];

export default async function handleToken(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
    return;
  }

  try {
    if (!apiKey || !apiSecret) {
      res.status(500).json({ error: "Environment variables aren't set up correctly" });
      return;
    }

    // Get role from request body
    const { role } = req.body;
    
    // Validate role
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ error: `Invalid or missing role. Must be one of: ${validRoles.join(', ')}` });
      return;
    }

    const roomName = `room-${generateRandomAlphanumeric(4)}-${generateRandomAlphanumeric(4)}`;
    const identity = `identity-${generateRandomAlphanumeric(4)}`;

    // Add metadata with role information
    const metadata = JSON.stringify({ role });

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };

    const token = await createToken({ identity, metadata }, grant);
    const result: TokenResult = {
      identity,
      accessToken: token,
    };

    // Log successful token generation (remove in production)
    console.log('Token generated for role:', role);

    res.status(200).json(result);
  } catch (e) {
    console.error('Token generation error:', e);
    res.status(500).json({ 
      error: "Failed to generate token",
      details: (e as Error).message 
    });
  }
}