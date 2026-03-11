"use client";

import { memo, useMemo, useCallback, useState } from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
    Marker,
    Line,
} from "react-simple-maps";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// ─── ASEAN Country Config ───────────────────────────────────
const ASEAN_COUNTRIES: Record<string, {
    name: string;
    flag: string;
    coords: [number, number];
    iso: string;
}> = {
    Singapore: { name: "Singapore", flag: "🇸🇬", coords: [103.82, 1.35], iso: "702" },
    Brunei: { name: "Brunei", flag: "🇧🇳", coords: [114.95, 4.94], iso: "096" },
    Indonesia: { name: "Indonesia", flag: "🇮🇩", coords: [106.85, -6.21], iso: "360" },
    Thailand: { name: "Thailand", flag: "🇹🇭", coords: [100.52, 13.76], iso: "764" },
    Philippines: { name: "Philippines", flag: "🇵🇭", coords: [121.00, 14.58], iso: "608" },
    Vietnam: { name: "Vietnam", flag: "🇻🇳", coords: [105.85, 21.03], iso: "704" },
};

// Sarawak origin point
const SARAWAK: [number, number] = [110.35, 1.55];

const GEO_URL = "/world-topo.json";

interface AseanMapProps {
    selected: string | null;
    onSelect: (country: string) => void;
    loading?: boolean;
}

function AseanMapInner({ selected, onSelect, loading }: AseanMapProps) {
    const selectedIso = selected ? ASEAN_COUNTRIES[selected]?.iso : null;
    const [hovered, setHovered] = useState<string | null>(null);

    // Countries to highlight
    const aseanIsos = useMemo(
        () => new Set(Object.values(ASEAN_COUNTRIES).map((c) => c.iso)),
        []
    );

    const handleGeoClick = useCallback(
        (geoId: string) => {
            const found = Object.entries(ASEAN_COUNTRIES).find(
                ([, v]) => v.iso === geoId
            );
            if (found) onSelect(found[0]);
        },
        [onSelect]
    );

    return (
        <div className="geo-map-wrap">
            <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                wheel={{ step: 0.1 }}
                doubleClick={{ mode: "reset" }}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        {/* Zoom controls */}
                        <div className="geo-zoom-controls">
                            <button onClick={() => zoomIn()} className="geo-zoom-btn" title="Zoom in">
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                            </button>
                            <button onClick={() => zoomOut()} className="geo-zoom-btn" title="Zoom out">
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>remove</span>
                            </button>
                            <button onClick={() => resetTransform()} className="geo-zoom-btn" title="Reset view">
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>fit_screen</span>
                            </button>
                        </div>

                        <TransformComponent
                            wrapperStyle={{ width: "100%", height: "100%" }}
                            contentStyle={{ width: "100%", height: "100%" }}
                        >
                            <ComposableMap
                                projection="geoMercator"
                                projectionConfig={{
                                    center: [112, 5],
                                    scale: 900,
                                }}
                                width={600}
                                height={500}
                                style={{ width: "100%", height: "100%" }}
                            >
                                <Geographies geography={GEO_URL}>
                                    {({ geographies }) =>
                                        geographies.map((geo) => {
                                            const geoId = geo.id;
                                            const isAsean = aseanIsos.has(geoId);
                                            const isSelected = geoId === selectedIso;
                                            const isHovered = geoId === hovered;

                                            return (
                                                <Geography
                                                    key={geo.rsmKey}
                                                    geography={geo}
                                                    onClick={() => handleGeoClick(geoId)}
                                                    onMouseEnter={() => {
                                                        if (isAsean) setHovered(geoId);
                                                    }}
                                                    onMouseLeave={() => setHovered(null)}
                                                    style={{
                                                        default: {
                                                            fill: isSelected
                                                                ? "rgba(6, 182, 212, 0.3)"
                                                                : isAsean
                                                                    ? "rgba(6, 182, 212, 0.08)"
                                                                    : "#0e1525",
                                                            stroke: isAsean ? "#06b6d4" : "#1e293b",
                                                            strokeWidth: isAsean ? 0.8 : 0.3,
                                                            outline: "none",
                                                            cursor: isAsean ? "pointer" : "default",
                                                            transition: "all 0.3s",
                                                        },
                                                        hover: {
                                                            fill: isAsean
                                                                ? "rgba(6, 182, 212, 0.2)"
                                                                : "#0e1525",
                                                            stroke: isAsean ? "#22d3ee" : "#1e293b",
                                                            strokeWidth: isAsean ? 1.2 : 0.3,
                                                            outline: "none",
                                                        },
                                                        pressed: {
                                                            fill: "rgba(6, 182, 212, 0.35)",
                                                            outline: "none",
                                                        },
                                                    }}
                                                />
                                            );
                                        })
                                    }
                                </Geographies>

                                {/* Sarawak origin marker */}
                                <Marker coordinates={SARAWAK}>
                                    <circle r={5} fill="#10b981" stroke="#0a0f1a" strokeWidth={2} />
                                    <text
                                        textAnchor="middle"
                                        y={-12}
                                        style={{
                                            fontFamily: "Orbitron, sans-serif",
                                            fontSize: 7,
                                            fill: "#10b981",
                                            fontWeight: 700,
                                        }}
                                    >
                                        SARAWAK
                                    </text>
                                </Marker>

                                {/* Country labels */}
                                {Object.entries(ASEAN_COUNTRIES).map(([name, info]) => (
                                    <Marker key={name} coordinates={info.coords}>
                                        <text
                                            textAnchor="middle"
                                            y={4}
                                            style={{
                                                fontFamily: "Orbitron, sans-serif",
                                                fontSize: 6,
                                                fill: selected === name ? "#22d3ee" : "#475569",
                                                fontWeight: selected === name ? 700 : 400,
                                                letterSpacing: "0.05em",
                                                cursor: "pointer",
                                                transition: "all 0.3s",
                                            }}
                                            onClick={() => onSelect(name)}
                                        >
                                            {info.flag} {name.toUpperCase()}
                                        </text>
                                    </Marker>
                                ))}

                                {/* Animated arc from Sarawak to selected destination */}
                                {selected && ASEAN_COUNTRIES[selected] && (
                                    <Line
                                        from={SARAWAK}
                                        to={ASEAN_COUNTRIES[selected].coords}
                                        stroke="#22d3ee"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeDasharray="6 4"
                                        className="geo-arc-animate"
                                    />
                                )}
                            </ComposableMap>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>

            {/* Loading overlay */}
            {loading && (
                <div className="geo-map-loading">
                    <span className="material-symbols-outlined cmd-spin" style={{ fontSize: 32, color: "#22d3ee" }}>
                        progress_activity
                    </span>
                    <span>Analyzing route...</span>
                </div>
            )}
        </div>
    );
}

const AseanMap = memo(AseanMapInner);
export default AseanMap;
