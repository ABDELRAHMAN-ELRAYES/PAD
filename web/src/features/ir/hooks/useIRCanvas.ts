import { useState, useEffect, useRef } from "react";
import { ProjectIRSchema, Relationship } from "../types/ir";

export function useIRCanvas(schema: ProjectIRSchema | null) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Node Dragging & Repositioning ---
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [activeDragNodeId, setActiveDragNodeId] = useState<string | null>(null);

  // --- Node Edit State ---
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // --- Fullscreen Toggle State ---
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    const target = e.target as HTMLElement;
    // Don't drag canvas if clicking interactive fields or card edit buttons
    if (target.closest("button, input, select, textarea, [data-interactive]")) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    const target = e.target as HTMLElement;
    // Don't drag card if clicking inputs/buttons
    if (target.closest("button, input, select, textarea, [data-interactive]")) return;
    
    e.stopPropagation(); // Stop canvas panning
    setActiveDragNodeId(nodeId);
    
    const currentPos = nodePositions[nodeId] || getInitialNodePosition(nodeId);
    setDragStart({
      x: e.clientX - currentPos.x * scale,
      y: e.clientY - currentPos.y * scale
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeDragNodeId) {
      const newX = (e.clientX - dragStart.x) / scale;
      const newY = (e.clientY - dragStart.y) / scale;
      setNodePositions((prev) => ({
        ...prev,
        [activeDragNodeId]: { x: newX, y: newY }
      }));
    } else if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
    setActiveDragNodeId(null);
  };

  const handleZoomIn = () => {
    setScale((s) => Math.min(s + 0.15, 3));
  };

  const handleZoomOut = () => {
    setScale((s) => Math.max(s - 0.15, 0.3));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 1.08;
      if (e.deltaY < 0) {
        setScale((s) => Math.min(s * zoomFactor, 3));
      } else {
        setScale((s) => Math.max(s / zoomFactor, 0.3));
      }
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [schema, canvasRef.current]);

  const getEntityPosition = (index: number) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    return {
      x: col * 360 + 50,
      y: row * 400 + 80,
    };
  };

  const getModulePosition = (index: number) => {
    return {
      x: 820,
      y: index * 280 + 80,
    };
  };

  const getRolePosition = (index: number) => {
    return {
      x: 1180,
      y: index * 300 + 80,
    };
  };

  const getRulePosition = (index: number) => {
    return {
      x: 1540,
      y: index * 260 + 80,
    };
  };

  const getInitialNodePosition = (nodeId: string) => {
    if (!schema) return { x: 100, y: 100 };
    if (nodeId.startsWith("entity-")) {
      const name = nodeId.replace("entity-", "");
      const idx = schema.entities.findIndex((e) => e.name === name);
      return getEntityPosition(idx === -1 ? 0 : idx);
    }
    if (nodeId.startsWith("module-")) {
      const name = nodeId.replace("module-", "");
      const idx = schema.modules.findIndex((m) => m.name === name);
      return getModulePosition(idx === -1 ? 0 : idx);
    }
    if (nodeId.startsWith("role-")) {
      const name = nodeId.replace("role-", "");
      const idx = schema.roles.findIndex((r) => r.name === name);
      return getRolePosition(idx === -1 ? 0 : idx);
    }
    if (nodeId.startsWith("rule-")) {
      const title = nodeId.replace("rule-", "");
      const idx = schema.businessRules.findIndex((r) => r.title === title);
      return getRulePosition(idx === -1 ? 0 : idx);
    }
    return { x: 100, y: 100 };
  };

  const getRelationshipPoints = (rel: Relationship) => {
    if (!schema) return null;
    const fromIdx = schema.entities.findIndex((e) => e.name === rel.fromEntity);
    const toIdx = schema.entities.findIndex((e) => e.name === rel.toEntity);
    if (fromIdx === -1 || toIdx === -1) return null;

    const fromKey = `entity-${rel.fromEntity}`;
    const toKey = `entity-${rel.toEntity}`;

    const fromPos = nodePositions[fromKey] || getEntityPosition(fromIdx);
    const toPos = nodePositions[toKey] || getEntityPosition(toIdx);

    const cardW = 320;
    const cardH = 260; // Estimated height of table card

    const fromAnchors = [
      { x: fromPos.x + cardW, y: fromPos.y + cardH / 2, dir: "right" },
      { x: fromPos.x, y: fromPos.y + cardH / 2, dir: "left" },
      { x: fromPos.x + cardW / 2, y: fromPos.y + cardH, dir: "bottom" },
      { x: fromPos.x + cardW / 2, y: fromPos.y, dir: "top" }
    ];

    const toAnchors = [
      { x: toPos.x, y: toPos.y + cardH / 2, dir: "left" },
      { x: toPos.x + cardW, y: toPos.y + cardH / 2, dir: "right" },
      { x: toPos.x + cardW / 2, y: toPos.y, dir: "top" },
      { x: toPos.x + cardW / 2, y: toPos.y + cardH, dir: "bottom" }
    ];

    let minDist = Infinity;
    let bestFrom = fromAnchors[0];
    let bestTo = toAnchors[0];

    for (const fa of fromAnchors) {
      for (const ta of toAnchors) {
        const dist = Math.hypot(ta.x - fa.x, ta.y - fa.y);
        if (dist < minDist) {
          minDist = dist;
          bestFrom = fa;
          bestTo = ta;
        }
      }
    }

    const strength = Math.min(Math.max(minDist * 0.3, 40), 100);
    let cp1x = bestFrom.x;
    let cp1y = bestFrom.y;
    let cp2x = bestTo.x;
    let cp2y = bestTo.y;

    if (bestFrom.dir === "right") cp1x += strength;
    else if (bestFrom.dir === "left") cp1x -= strength;
    else if (bestFrom.dir === "bottom") cp1y += strength;
    else if (bestFrom.dir === "top") cp1y -= strength;

    if (bestTo.dir === "right") cp2x += strength;
    else if (bestTo.dir === "left") cp2x -= strength;
    else if (bestTo.dir === "bottom") cp2y += strength;
    else if (bestTo.dir === "top") cp2y -= strength;

    const path = `M ${bestFrom.x} ${bestFrom.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${bestTo.x} ${bestTo.y}`;

    return {
      sx: bestFrom.x,
      sy: bestFrom.y,
      tx: bestTo.x,
      ty: bestTo.y,
      mx: (bestFrom.x + bestTo.x) / 2,
      my: (bestFrom.y + bestTo.y) / 2,
      path
    };
  };

  // Synchronize dynamic coordinates on schema load
  useEffect(() => {
    if (!schema) return;
    const initialPositions = { ...nodePositions };
    let changed = false;

    schema.entities.forEach((entity, idx) => {
      const key = `entity-${entity.name}`;
      if (!initialPositions[key]) {
        initialPositions[key] = getEntityPosition(idx);
        changed = true;
      }
    });

    schema.modules.forEach((mod, idx) => {
      const key = `module-${mod.name}`;
      if (!initialPositions[key]) {
        initialPositions[key] = getModulePosition(idx);
        changed = true;
      }
    });

    schema.roles.forEach((role, idx) => {
      const key = `role-${role.name}`;
      if (!initialPositions[key]) {
        initialPositions[key] = getRolePosition(idx);
        changed = true;
      }
    });

    schema.businessRules.forEach((rule, idx) => {
      const key = `rule-${rule.title}`;
      if (!initialPositions[key]) {
        initialPositions[key] = getRulePosition(idx);
        changed = true;
      }
    });

    if (changed) {
      setNodePositions(initialPositions);
    }
  }, [schema]);

  return {
    scale,
    position,
    canvasRef,
    nodePositions,
    editingNodeId,
    isFullscreen,
    setNodePositions,
    setEditingNodeId,
    setIsFullscreen,
    handleMouseDown,
    handleNodeMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleZoomIn,
    handleZoomOut,
    handleReset,
    getInitialNodePosition,
    getRelationshipPoints
  };
}
