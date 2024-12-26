"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const TShapeMaze = () => {
  const [position, setPosition] = useState({ x: 100, y: 150 });
  const [rotation, setRotation] = useState(0);
  const [showWin, setShowWin] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [keys, setKeys] = useState(new Set());
  const containerRef = useRef(null);
  const rotationRef = useRef({ startAngle: 0, startMouseAngle: 0, rotationCenterX: 0, rotationCenterY: 0 });
  const moveSpeed = 3;

  const dimensions = useMemo(() => ({
    tBaseWidth: 12,
    tBaseHeight: 100,
    tTopWidth: 100,
    tTopHeight: 12,
    tBottomWidth: 50,
    tBottomHeight: 12,
    handleSize: 24,
    handleOffset: 20,
    gameWidth: 600,
    gameHeight: 300
  }), []);
const walls = useMemo(() => [
    { x: 160, y: 20, width: 20, height: 100 },
    { x: 160, y: 210, width: 20, height: 100 },
    { x: 300, y: 20, width: 20, height: 100 }, // 右上角的墙壁的 x 坐标减小
    { x: 300, y: 210, width: 20, height: 100 }  // 右下角的墙壁的 x 坐标减小
  ], []);
  const rotatePoint = useCallback((x, y, cx, cy, angle) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const nx = (cos * (x - cx)) - (sin * (y - cy)) + cx;
    const ny = (sin * (x - cx)) + (cos * (y - cy)) + cy;
    return { x: nx, y: ny };
  }, []);

  const doLinesIntersect = useCallback((p1, p2, p3, p4) => {
    const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
  }, []);

  const checkCollision = useCallback((newX, newY, newRotation) => {
    const { tBaseWidth, tBaseHeight, tTopWidth, tTopHeight, tBottomWidth, tBottomHeight, gameWidth, gameHeight } = dimensions;
    const angleRad = (newRotation * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const centerX = newX + tBaseWidth / 2;
    const centerY = newY + tBaseHeight / 2;

    const getRotatedCorners = (x, y, width, height) => {
      const corners = [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }];
      return corners.map(p => rotatePoint(p.x, p.y, centerX, centerY, angleRad));
    };

    const baseCorners = getRotatedCorners(newX, newY, tBaseWidth, tBaseHeight);
    const topBarX = newX - (tTopWidth - tBaseWidth) / 2;
    const topCorners = getRotatedCorners(topBarX, newY, tTopWidth, tTopHeight);
    const bottomBarX = newX - (tBottomWidth - tBaseWidth) / 2;
    const bottomBarY = newY + tBaseHeight - tBottomHeight;
    const bottomCorners = getRotatedCorners(bottomBarX, bottomBarY, tBottomWidth, tBottomHeight);
    const allCorners = [...baseCorners, ...topCorners, ...bottomCorners];

    const bounds = allCorners.reduce((b, p) => ({ minX: Math.min(b.minX, p.x), maxX: Math.max(b.maxX, p.x), minY: Math.min(b.minY, p.y), maxY: Math.max(b.maxY, p.y) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    if (bounds.minX < 0 || bounds.maxX > gameWidth || bounds.minY < 0 || bounds.maxY > gameHeight) return true;

    const getEdges = (corners) => {
      const edges = [];
      for (let i = 0; i < corners.length; i++) {
        edges.push({ start: corners[i], end: corners[(i + 1) % corners.length] });
      }
      return edges;
    };

    const tEdges = [...getEdges(baseCorners), ...getEdges(topCorners), ...getEdges(bottomCorners)];

    for (const wall of walls) {
      const wallEdges = [
        { start: { x: wall.x, y: wall.y }, end: { x: wall.x + wall.width, y: wall.y } },
        { start: { x: wall.x + wall.width, y: wall.y }, end: { x: wall.x + wall.width, y: wall.y + wall.height } },
        { start: { x: wall.x + wall.width, y: wall.y + wall.height }, end: { x: wall.x, y: wall.y + wall.height } },
        { start: { x: wall.x, y: wall.y + wall.height }, end: { x: wall.x, y: wall.y } }
      ];
      for (const tEdge of tEdges) {
        for (const wallEdge of wallEdges) {
          if (doLinesIntersect(tEdge.start, tEdge.end, wallEdge.start, wallEdge.end)) return true;
        }
      }
    }
    return false;
  }, [dimensions, walls, rotatePoint, doLinesIntersect]);

  const calculateAngleToCenter = useCallback((mouseX, mouseY, centerX, centerY) => {
    return Math.atan2(mouseY - centerY, mouseX - centerX) * 180 / Math.PI;
  }, []);

  const handleRotationStart = useCallback((e, handleType) => {
    e.stopPropagation();
    setIsRotating(true);
    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - containerRect.left;
    const relativeY = e.clientY - containerRect.top;
    const centerX = position.x + dimensions.tBaseWidth / 2;
    const centerY = handleType === 'top' ? position.y : position.y + dimensions.tBaseHeight;
    rotationRef.current = {
      startAngle: rotation,
      startMouseAngle: calculateAngleToCenter(relativeX, relativeY, centerX, centerY),
      rotationCenterX: centerX,
      rotationCenterY: centerY
    };
  }, [calculateAngleToCenter, position, rotation, dimensions]);

  const handleMouseMove = useCallback((e) => {
    if (!isRotating) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - containerRect.left;
    const relativeY = e.clientY - containerRect.top;
    const currentMouseAngle = calculateAngleToCenter(relativeX, relativeY, rotationRef.current.rotationCenterX, rotationRef.current.rotationCenterY);
    let targetAngle = (rotationRef.current.startAngle + (currentMouseAngle - rotationRef.current.startMouseAngle)) % 360;
    if (targetAngle < 0) targetAngle += 360;

    const snapThreshold = 5;
    const snapAngles = [0, 90, 180, 270];
    for (const snapAngle of snapAngles) {
      if (Math.abs(targetAngle - snapAngle) < snapThreshold) {
        targetAngle = snapAngle;
        break;
      }
    }

    const step = 5; // 旋转的步长，可以调整
    let currentRotation = rotation;
    const diff = targetAngle - currentRotation;
    const shortestAngle = ((diff + 180) % 360) - 180; // 获取最短旋转角度

    const numSteps = Math.ceil(Math.abs(shortestAngle) / step);
    const increment = shortestAngle / numSteps;

    for (let i = 1; i <= numSteps; i++) {
      const nextRotation = (currentRotation + increment + 360) % 360; // 确保角度在 0-360 之间
      if (!checkCollision(position.x, position.y, nextRotation)) {
        currentRotation = nextRotation;
      } else {
        break; // 发生碰撞，停止旋转
      }
    }

    setRotation(currentRotation);

  }, [isRotating, position, calculateAngleToCenter, checkCollision, rotation]);

  const handleMouseUp = useCallback(() => {
    setIsRotating(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        setKeys(prev => new Set(prev).add(e.key));
      }
    };
    const handleKeyUp = (e) => {
      const nextKeys = new Set(keys);
      nextKeys.delete(e.key);
      setKeys(nextKeys);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mouseup', handleMouseUp); // Attach mouseup globally for rotation

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [keys, handleMouseUp]);

  useEffect(() => {
    let animationFrameId;
    const updatePosition = () => {
      let newX = position.x;
      let newY = position.y;

      if (keys.has('ArrowLeft')) newX -= moveSpeed;
      if (keys.has('ArrowRight')) newX += moveSpeed;
      if (keys.has('ArrowUp')) newY -= moveSpeed;
      if (keys.has('ArrowDown')) newY += moveSpeed;

      if (newX !== position.x || newY !== position.y) {
        if (!checkCollision(newX, newY, rotation)) {
          setPosition({ x: newX, y: newY });
          if (newX > 500) setShowWin(true);
        }
      }
      animationFrameId = requestAnimationFrame(updatePosition);
    };

    animationFrameId = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(animationFrameId);
  }, [keys, position, rotation, checkCollision, moveSpeed]);

  return (
    <div className="w-full max-w-2xl mx-auto p-4" onMouseUp={handleMouseUp}>
      <div
        ref={containerRef}
        className="relative bg-gray-100 w-full h-96 border-2 border-gray-300 rounded-lg overflow-hidden outline-none"
        tabIndex={0}
        onMouseMove={handleMouseMove}
      >
        {/* T Shape */}
        <div
          className="absolute"
          style={{
            left: position.x,
            top: position.y,
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${dimensions.tBaseWidth / 2}px ${dimensions.tBaseHeight / 2}px`
          }}
        >
          {/* Rotation handles */}
          <div
            className="absolute flex items-center justify-center"
            style={{
              left: dimensions.tBaseWidth / 2 - dimensions.handleSize / 2,
              top: -dimensions.handleOffset,
              width: dimensions.handleSize,
              height: dimensions.handleSize,
            }}
            onMouseDown={(e) => handleRotationStart(e, 'top')}
          >
            <div className="w-6 h-6 bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600 transition-colors duration-200 shadow-md">
              <div className="w-4 h-1 bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
            </div>
          </div>
          <div
            className="absolute flex items-center justify-center"
            style={{
              left: dimensions.tBaseWidth / 2 - dimensions.handleSize / 2,
              top: dimensions.tBaseHeight + dimensions.handleOffset - dimensions.handleSize,
              width: dimensions.handleSize,
              height: dimensions.handleSize,
            }}
            onMouseDown={(e) => handleRotationStart(e, 'bottom')}
          >
            <div className="w-6 h-6 bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600 transition-colors duration-200 shadow-md">
              <div className="w-4 h-1 bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" />
            </div>
          </div>

          {/* T Shape body */}
          <div
            className="absolute bg-red-500 transition-colors duration-200"
            style={{
              width: dimensions.tBaseWidth,
              height: dimensions.tBaseHeight,
            }}
          />
          <div
            className="absolute bg-red-500 transition-colors duration-200"
            style={{
              left: -(dimensions.tTopWidth - dimensions.tBaseWidth) / 2,
              width: dimensions.tTopWidth,
              height: dimensions.tTopHeight,
            }}
          />
          <div
            className="absolute bg-red-500 transition-colors duration-200"
            style={{
              left: -(dimensions.tBottomWidth - dimensions.tBaseWidth) / 2,
              top: dimensions.tBaseHeight - dimensions.tBottomHeight,
              width: dimensions.tBottomWidth,
              height: dimensions.tBottomHeight,
            }}
          />
        </div>

        {/* Walls */}
        {walls.map((wall, index) => (
          <div
            key={index}
            className="absolute bg-gray-300"
            style={{
              left: wall.x,
              top: wall.y,
              width: wall.width,
              height: wall.height,
            }}
          />
        ))}

        {/* Win message */}
        {showWin && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-100 border border-green-500 rounded-lg p-4 shadow-lg">
            <p className="text-green-700">Congratulations! You've completed the maze!</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-gray-600">
        Use arrow keys to move the red T-shaped object.
        Rotate using the blue dots with mouse.
        Find the correct angle to pass through the gaps!
      </div>
    </div>
  );
};

export default TShapeMaze;
