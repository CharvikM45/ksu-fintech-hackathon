"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Webcam from "react-webcam";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

interface Detection {
    bbox: [number, number, number, number];
    class: string;
    score: number;
}

interface TrackedObject {
    id: string;
    class: string;
    bbox: [number, number, number, number];
    lastSeen: number;
    prevArea: number;
    approaching: boolean;
}

interface ObjectDetectorProps {
    onDetections: (detections: Detection[]) => void;
    onApproaching: (object: TrackedObject) => void;
    onQueryResponse: (response: string) => void;
    queryTrigger: number;
}

export default function ObjectDetector({
    onDetections,
    onApproaching,
    onQueryResponse,
    queryTrigger,
}: ObjectDetectorProps) {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
    const trackedObjectsRef = useRef<Map<string, TrackedObject>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const lastDetectionsRef = useRef<Detection[]>([]);

    // Load COCO-SSD model
    useEffect(() => {
        const loadModel = async () => {
            try {
                const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
                modelRef.current = model;
                setIsLoading(false);
            } catch (err) {
                setError("Failed to load detection model");
                console.error(err);
            }
        };
        loadModel();
    }, []);

    // Handle "What is that?" query
    useEffect(() => {
        if (queryTrigger > 0 && lastDetectionsRef.current.length > 0) {
            const centerDetections = lastDetectionsRef.current.filter((d) => {
                const [x, y, w, h] = d.bbox;
                const centerX = x + w / 2;
                const centerY = y + h / 2;
                const video = webcamRef.current?.video;
                if (!video) return false;
                const vCenterX = video.videoWidth / 2;
                const vCenterY = video.videoHeight / 2;
                const threshold = Math.min(video.videoWidth, video.videoHeight) * 0.3;
                return (
                    Math.abs(centerX - vCenterX) < threshold &&
                    Math.abs(centerY - vCenterY) < threshold
                );
            });

            if (centerDetections.length > 0) {
                const best = centerDetections.reduce((a, b) =>
                    a.score > b.score ? a : b
                );
                onQueryResponse(
                    `That is a ${best.class} with ${Math.round(best.score * 100)}% confidence`
                );
            } else if (lastDetectionsRef.current.length > 0) {
                const objects = [...new Set(lastDetectionsRef.current.map((d) => d.class))];
                onQueryResponse(`I can see: ${objects.join(", ")}`);
            } else {
                onQueryResponse("I cannot identify any objects right now");
            }
        }
    }, [queryTrigger, onQueryResponse]);

    // Detection loop
    const detect = useCallback(async () => {
        if (
            !modelRef.current ||
            !webcamRef.current?.video ||
            !canvasRef.current
        )
            return;

        const video = webcamRef.current.video;
        if (video.readyState !== 4) return;

        const predictions = await modelRef.current.detect(video);
        lastDetectionsRef.current = predictions;

        // Draw on canvas
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // Track objects and detect approaching
        const now = Date.now();
        const newTracked = new Map<string, TrackedObject>();

        predictions.forEach((pred, idx) => {
            const [x, y, w, h] = pred.bbox;
            const area = w * h;
            const key = `${pred.class}_${idx}`;

            // Draw bounding box
            ctx.strokeStyle = pred.class === "person" ? "#ff4444" : "#44ff44";
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);

            // Draw label
            ctx.fillStyle = ctx.strokeStyle;
            ctx.font = "bold 16px Arial";
            ctx.fillText(
                `${pred.class} ${Math.round(pred.score * 100)}%`,
                x,
                y > 20 ? y - 5 : y + 20
            );

            // Check if approaching
            const existing = trackedObjectsRef.current.get(key);
            const approaching =
                existing && area > existing.prevArea * 1.15 && pred.class === "person";

            const tracked: TrackedObject = {
                id: key,
                class: pred.class,
                bbox: pred.bbox,
                lastSeen: now,
                prevArea: area,
                approaching: !!approaching,
            };

            newTracked.set(key, tracked);

            if (approaching) {
                onApproaching(tracked);
            }
        });

        trackedObjectsRef.current = newTracked;
        onDetections(predictions);
    }, [onDetections, onApproaching]);

    // Run detection loop
    useEffect(() => {
        if (isLoading) return;

        const interval = setInterval(detect, 150); // ~6-7 FPS for performance
        return () => clearInterval(interval);
    }, [isLoading, detect]);

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-red-500 text-xl">
                {error}
            </div>
        );
    }

    return (
        <div className="relative w-full h-full">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                    <div className="text-white text-xl animate-pulse">
                        Loading AI Model...
                    </div>
                </div>
            )}
            <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                }}
                className="absolute inset-0 w-full h-full object-cover"
            />
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
        </div>
    );
}
