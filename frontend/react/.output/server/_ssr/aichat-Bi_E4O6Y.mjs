import { a as __toESM } from "../_runtime.mjs";
import { n as AnimatePresence, t as motion } from "../_libs/framer-motion.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { h as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import "./router-CGg5CKCm.mjs";
import { t as imageCompression } from "../_libs/browser-image-compression.mjs";
import { t as Markdown } from "../_libs/react-markdown+[...].mjs";
import { t as remarkGfm } from "../_libs/remark-gfm.mjs";
import { t as m } from "../_libs/react-error-boundary.mjs";
import { t as require_maplibre_gl } from "../_libs/maplibre-gl.mjs";
import { n as polygon, t as bbox } from "../_libs/@turf/bbox+[...].mjs";
import { t as Slot } from "../_libs/radix-ui__react-slot.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/aichat-Bi_E4O6Y.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_maplibre_gl = /* @__PURE__ */ __toESM(require_maplibre_gl());
var API_BASE = "http://localhost:8000";
var PIPELINE_STAGES = [
	{
		icon: "📤",
		title: "Uploading Image...",
		desc: "Transferring file to secure server"
	},
	{
		icon: "🛰️",
		title: "Running RemoteCLIP...",
		desc: "Extracting vision features"
	},
	{
		icon: "🌍",
		title: "Interpreting EO Context...",
		desc: "Mapping land cover & vegetation"
	},
	{
		icon: "💬",
		title: "Generating GPT Response...",
		desc: "Synthesizing AI insights"
	}
];
function useAnalysis() {
	const [file, setFile] = (0, import_react.useState)(null);
	const [previewUrl, setPreviewUrl] = (0, import_react.useState)(null);
	const [status, setStatus] = (0, import_react.useState)("idle");
	const [stageIndex, setStageIndex] = (0, import_react.useState)(-1);
	const [result, setResult] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [sessions, setSessions] = (0, import_react.useState)([]);
	const [isStreaming, setIsStreaming] = (0, import_react.useState)(false);
	const [insightLoading, setInsightLoading] = (0, import_react.useState)(false);
	const [abortController, setAbortController] = (0, import_react.useState)(null);
	const [coordinates, setCoordinates] = (0, import_react.useState)(null);
	const [bbox, setBbox] = (0, import_react.useState)(null);
	const timers = (0, import_react.useRef)([]);
	return {
		file,
		previewUrl,
		status,
		stageIndex,
		result,
		error,
		messages,
		sessions,
		isStreaming,
		insightLoading,
		coordinates,
		setCoordinates,
		bbox,
		setBbox,
		handleFile: (0, import_react.useCallback)(async (f) => {
			setError(null);
			if (!f) return;
			if (![
				"image/png",
				"image/jpeg",
				"image/jpg"
			].includes(f.type)) {
				setError(`Invalid file type. Please upload a PNG or JPG image.`);
				return;
			}
			try {
				const compressedFile = await imageCompression(f, {
					maxSizeMB: 2,
					maxWidthOrHeight: 1920,
					useWebWorker: true
				});
				setFile(compressedFile);
				setPreviewUrl(URL.createObjectURL(compressedFile));
			} catch (err) {
				console.error("Image compression error", err);
				if (f.size > 10 * 1024 * 1024) {
					setError(`File is too large. Max size is 10MB.`);
					return;
				}
				setFile(f);
				setPreviewUrl(URL.createObjectURL(f));
			}
		}, []),
		handleReset: (0, import_react.useCallback)(() => {
			if (messages.length > 0 || result || file) setSessions((prev) => [{
				id: Date.now(),
				date: /* @__PURE__ */ new Date(),
				messages,
				result,
				file,
				previewUrl
			}, ...prev]);
			setMessages([]);
			setFile(null);
			setPreviewUrl(null);
			setCoordinates(null);
			setBbox(null);
			setStatus("idle");
			setResult(null);
			setError(null);
			setStageIndex(-1);
			abortController?.abort();
			setAbortController(null);
			setIsStreaming(false);
			timers.current.forEach(clearTimeout);
			timers.current = [];
		}, [
			messages,
			result,
			file,
			previewUrl,
			abortController
		]),
		restoreSession: (0, import_react.useCallback)((s) => {
			setMessages(s.messages);
			setResult(s.result);
			setFile(s.file);
			setPreviewUrl(s.previewUrl);
			setStatus(s.result || s.messages.length > 0 ? "done" : "idle");
		}, []),
		runAnalysis: (0, import_react.useCallback)(async (prompt) => {
			if (!file || !prompt.trim()) return;
			setMessages((prev) => [...prev, {
				role: "user",
				text: prompt
			}]);
			setStatus("running");
			setResult(null);
			setError(null);
			setStageIndex(0);
			timers.current.forEach(clearTimeout);
			timers.current = [];
			[
				1,
				2,
				3
			].forEach((i) => {
				const t = setTimeout(() => setStageIndex(i), i * 350);
				timers.current.push(t);
			});
			const minDuration = new Promise((resolve) => {
				const t = setTimeout(resolve, PIPELINE_STAGES.length * 350);
				timers.current.push(t);
			});
			try {
				const formData = new FormData();
				formData.append("image", file, file.name || "image.jpeg");
				if (coordinates) {
					formData.append("latitude", coordinates.lat.toString());
					formData.append("longitude", coordinates.lng.toString());
				}
				if (bbox) {
					formData.append("min_latitude", bbox.minLat.toString());
					formData.append("min_longitude", bbox.minLng.toString());
					formData.append("max_latitude", bbox.maxLat.toString());
					formData.append("max_longitude", bbox.maxLng.toString());
					formData.append("bbox", JSON.stringify([
						bbox.minLat,
						bbox.minLng,
						bbox.maxLat,
						bbox.maxLng
					]));
				}
				const controller = new AbortController();
				setAbortController(controller);
				const timeoutId = setTimeout(() => controller.abort(), 6e4);
				const fetchAnalysis = fetch(`${API_BASE}/api/analyze`, {
					method: "POST",
					body: formData,
					signal: controller.signal
				}).then(async (res) => {
					clearTimeout(timeoutId);
					if (!res.ok) {
						if (res.status === 413) throw new Error("Image too large for the backend to process.");
						if (res.status === 415) throw new Error("Unsupported image format.");
						let backendErrorStr = "";
						try {
							backendErrorStr = (await res.json()).detail || "";
						} catch (e) {}
						if (res.status === 400 || res.status === 422) throw new Error(backendErrorStr ? backendErrorStr : "Invalid image or request.");
						if (res.status >= 500) throw new Error("The backend encountered an unexpected error.");
						throw new Error(`Analysis failed due to an unknown error (${res.status}).`);
					}
					return await res.json();
				}).catch((err) => {
					clearTimeout(timeoutId);
					throw err;
				});
				const [data] = await Promise.all([fetchAnalysis, minDuration]);
				setResult(data);
				setStatus("done");
				setMessages((prev) => [...prev, {
					role: "assistant",
					text: data.professional_report || data.gpt_analysis || data.insight,
					isReport: true
				}]);
				setFile(null);
				setPreviewUrl(null);
			} catch (err) {
				setStatus("idle");
				setStageIndex(-1);
				let friendlyMsg = "Something went wrong while analyzing the image.";
				if (err.name === "AbortError") friendlyMsg = "The request timed out. The server took too long to respond.";
				else if (err instanceof TypeError) friendlyMsg = "Network failure. Could not connect to the backend server.";
				else if (err instanceof Error) friendlyMsg = err.message;
				setMessages((prev) => [...prev, {
					role: "assistant",
					text: `⚠️ Error: ${friendlyMsg}`
				}]);
				setError(friendlyMsg);
			}
		}, [
			file,
			coordinates,
			bbox
		]),
		askInsight: (0, import_react.useCallback)(async (question) => {
			if (!question.trim() || !result || insightLoading) return;
			setMessages((m) => [...m, {
				role: "user",
				text: question
			}]);
			setInsightLoading(true);
			try {
				const controller = new AbortController();
				setAbortController(controller);
				const res = await fetch(`${API_BASE}/api/insights`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						question,
						eo_context: {
							dominant_land_cover: result.dominant_land_cover,
							secondary_land_cover: result.secondary_land_cover,
							confidence: result.confidence,
							summary: result.summary
						}
					}),
					signal: controller.signal
				});
				if (!res.ok) throw new Error(`Insights request failed (${res.status})`);
				const data = await res.json();
				setMessages((m) => [...m, {
					role: "assistant",
					text: data.answer
				}]);
			} catch (err) {
				if (err.name !== "AbortError") setMessages((m) => [...m, {
					role: "assistant",
					text: `Insight generation is temporarily unavailable.`
				}]);
			} finally {
				setInsightLoading(false);
				setAbortController(null);
			}
		}, [result, insightLoading]),
		abortRequest: (0, import_react.useCallback)(() => {
			if (abortController) {
				abortController.abort();
				setAbortController(null);
				setIsStreaming(false);
				setStatus("done");
			}
		}, [abortController])
	};
}
var PipelineVisualizer = ({ stageIndex, status }) => {
	if (status !== "running") return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "cb-msg-bubble assistant",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "cb-pipeline",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: PIPELINE_STAGES.map((s, i) => {
				const isActive = stageIndex === i;
				const isDone = stageIndex > i;
				if (!isActive && !isDone) return null;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
					initial: {
						opacity: 0,
						y: 10
					},
					animate: {
						opacity: 1,
						y: 0
					},
					className: `cb-stage ${isActive ? "active" : ""} ${isDone ? "done" : ""}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "cb-stage-icon",
						children: isDone ? "✓" : isActive ? s.icon : "•"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: s.title })]
				}, s.title);
			}) })
		})
	});
};
function ErrorFallback({ error, resetErrorBoundary }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "cb-input-error",
		role: "alert",
		style: { marginTop: "20px" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Something went wrong rendering the analysis results:" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				style: { color: "red" },
				children: error.message
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				className: "cb-attach-btn",
				onClick: resetErrorBoundary,
				style: { marginTop: "10px" },
				children: "Try again"
			})
		]
	});
}
var AnalysisResults = (0, import_react.memo)(({ result, askInsight, insightLoading }) => {
	const [isDownloading, setIsDownloading] = (0, import_react.useState)(false);
	const [isFullscreen, setIsFullscreen] = (0, import_react.useState)(false);
	const htmlContent = result.professional_report || "<p>No unified report available.</p>";
	const downloadReport = async () => {
		setIsDownloading(true);
		try {
			const blob = new Blob([htmlContent], { type: "text/html" });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `Orionix_Geospatial_Intelligence_Report_${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.html`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Report Download error", err);
			alert("Failed to download HTML report");
		} finally {
			setIsDownloading(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(m, {
		FallbackComponent: ErrorFallback,
		children: [isFullscreen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			style: {
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				height: "100vh",
				backgroundColor: "#0f1115",
				zIndex: 9999,
				display: "flex",
				flexDirection: "column",
				padding: "20px",
				boxSizing: "border-box"
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "15px"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					style: {
						margin: 0,
						color: "#f8fafc",
						fontSize: "1.25rem",
						fontFamily: "Space Mono, monospace"
					},
					children: "Orionix Unified Report"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						gap: "10px"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "cb-attach-btn",
						onClick: downloadReport,
						disabled: isDownloading,
						style: { height: "36px" },
						children: isDownloading ? "Generating..." : "📄 Download HTML"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "cb-attach-btn",
						style: {
							background: "#7f1d1d",
							borderColor: "#ef4444",
							color: "#fca5a5",
							height: "36px"
						},
						onClick: () => setIsFullscreen(false),
						children: "✕ Close Fullscreen"
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					flex: 1,
					borderRadius: "12px",
					overflow: "hidden",
					border: "1px solid #334155"
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
					srcDoc: htmlContent,
					style: {
						width: "100%",
						height: "100%",
						border: "none",
						background: "#0f1115"
					},
					title: "Unified HTML Report Fullscreen"
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "cb-report-card orionix-reveal orionix-in",
			style: {
				padding: "10px",
				width: "100%",
				maxWidth: "1200px",
				margin: "0 auto"
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						justifyContent: "flex-end",
						marginBottom: "10px",
						gap: "10px"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "cb-attach-btn",
						onClick: () => setIsFullscreen(true),
						style: {
							fontSize: "13px",
							padding: "8px 16px",
							display: "flex",
							alignItems: "center",
							gap: "8px"
						},
						children: "🔍 Toggle Fullscreen"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "cb-attach-btn",
						onClick: downloadReport,
						disabled: isDownloading,
						style: {
							fontSize: "13px",
							padding: "8px 16px",
							display: "flex",
							alignItems: "center",
							gap: "8px"
						},
						children: isDownloading ? "Generating..." : "📄 Download Report (HTML)"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					style: {
						width: "100%",
						height: "800px",
						borderRadius: "16px",
						overflow: "hidden",
						border: "1px solid #334155"
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
						srcDoc: htmlContent,
						style: {
							width: "100%",
							height: "100%",
							border: "none"
						},
						title: "Unified HTML Report"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "dashboard-section",
					style: {
						marginTop: "24px",
						paddingTop: "16px",
						borderTop: "1px solid var(--border)"
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
							className: "cb-section-title",
							style: {
								fontSize: "0.85rem",
								textTransform: "uppercase",
								letterSpacing: "0.05em",
								color: "var(--muted)",
								margin: "0 0 12px",
								fontFamily: "Space Mono, monospace"
							},
							children: "💬 Quick AI Questions"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								flexWrap: "wrap",
								gap: "10px"
							},
							children: [
								{
									label: "🌱 Explain the environment",
									q: "Explain the environment"
								},
								{
									label: "🏗 Analyze infrastructure",
									q: "Analyze infrastructure"
								},
								{
									label: "⚠ Assess possible risks",
									q: "Assess possible risks"
								},
								{
									label: "📈 Future land use",
									q: "Future land use"
								},
								{
									label: "🧠 Explain like I'm 10",
									q: "Explain like I'm 10"
								}
							].map((btn, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "cb-attach-btn",
								disabled: insightLoading,
								onClick: () => askInsight(btn.q),
								style: {
									fontSize: "13px",
									padding: "8px 16px",
									height: "auto",
									display: "flex",
									alignItems: "center"
								},
								children: btn.label
							}, idx))
						}),
						insightLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "cb-insight-loading",
							style: {
								marginTop: "12px",
								fontSize: "0.9rem",
								color: "var(--muted)",
								display: "flex",
								alignItems: "center",
								gap: "8px"
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "cb-dot small pulse",
								style: {
									width: "6px",
									height: "6px",
									borderRadius: "50%",
									background: "var(--aurora)"
								}
							}), " Generating Insight..."]
						})
					]
				})
			]
		})]
	});
});
AnalysisResults.displayName = "AnalysisResults";
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
			destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
			outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
			secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
			ghost: "hover:bg-accent hover:text-accent-foreground",
			link: "text-primary underline-offset-4 hover:underline"
		},
		size: {
			default: "h-9 px-4 py-2",
			sm: "h-8 rounded-md px-3 text-xs",
			lg: "h-10 rounded-md px-8",
			icon: "h-9 w-9"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
function MapSelector({ onConfirm, onCancel, waterMaskBase64, analyzedBbox }) {
	const mapContainerRef = (0, import_react.useRef)(null);
	const mapRef = (0, import_react.useRef)(null);
	const markerRef = (0, import_react.useRef)(null);
	const [mode, setMode] = (0, import_react.useState)("point");
	const [selectedCoords, setSelectedCoords] = (0, import_react.useState)(null);
	const [selectedBbox, setSelectedBbox] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [showOverlay, setShowOverlay] = (0, import_react.useState)(true);
	const isDrawingRef = (0, import_react.useRef)(false);
	const startLngLatRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!mapContainerRef.current) return;
		const map = new import_maplibre_gl.default.Map({
			container: mapContainerRef.current,
			style: {
				version: 8,
				sources: { esri: {
					type: "raster",
					tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
					tileSize: 256,
					attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
				} },
				layers: [{
					id: "esri-satellite",
					type: "raster",
					source: "esri",
					minzoom: 0,
					maxzoom: 19
				}]
			},
			center: [78.9629, 20.5937],
			zoom: 5
		});
		mapRef.current = map;
		map.on("load", () => {
			map.addSource("draw-box", {
				type: "geojson",
				data: {
					type: "Feature",
					properties: {},
					geometry: {
						type: "Polygon",
						coordinates: []
					}
				}
			});
			map.addLayer({
				id: "draw-box-fill",
				type: "fill",
				source: "draw-box",
				paint: {
					"fill-color": "#06b6d4",
					"fill-opacity": .2
				}
			});
			map.addLayer({
				id: "draw-box-outline",
				type: "line",
				source: "draw-box",
				paint: {
					"line-color": "#06b6d4",
					"line-width": 2,
					"line-dasharray": [2, 2]
				}
			});
			setTimeout(() => {
				map.resize();
			}, 200);
		});
		map.addControl(new import_maplibre_gl.default.NavigationControl(), "top-right");
		const handleResize = () => {
			map.resize();
		};
		window.addEventListener("resize", handleResize);
		return () => {
			window.removeEventListener("resize", handleResize);
			map.remove();
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const map = mapRef.current;
		if (!map || !waterMaskBase64 || !analyzedBbox) return;
		const sourceId = "flood-mask-source";
		const layerId = "flood-mask-layer";
		const updateOverlay = () => {
			if (map.getSource(sourceId)) {
				if (map.getLayer(layerId)) map.removeLayer(layerId);
				map.removeSource(sourceId);
			}
			if (showOverlay) {
				const { minLat, minLng, maxLat, maxLng } = analyzedBbox;
				const coordinates = [
					[minLng, maxLat],
					[maxLng, maxLat],
					[maxLng, minLat],
					[minLng, minLat]
				];
				map.addSource(sourceId, {
					type: "image",
					url: `data:image/png;base64,${waterMaskBase64}`,
					coordinates
				});
				map.addLayer({
					id: layerId,
					type: "raster",
					source: sourceId,
					paint: { "raster-opacity": .5 }
				});
				map.fitBounds([
					minLng,
					minLat,
					maxLng,
					maxLat
				], {
					padding: 50,
					maxZoom: 15,
					animate: false
				});
			}
		};
		if (map.isStyleLoaded()) updateOverlay();
		else map.on("load", updateOverlay);
		return () => {
			if (mapRef.current) {
				const m = mapRef.current;
				if (m.getLayer(layerId)) m.removeLayer(layerId);
				if (m.getSource(sourceId)) m.removeSource(sourceId);
			}
		};
	}, [
		waterMaskBase64,
		analyzedBbox,
		showOverlay
	]);
	(0, import_react.useEffect)(() => {
		const map = mapRef.current;
		if (!map) return;
		if (waterMaskBase64 && analyzedBbox) return;
		if (markerRef.current) {
			markerRef.current.remove();
			markerRef.current = null;
		}
		setSelectedCoords(null);
		setSelectedBbox(null);
		clearBoxLayer();
		if (mode === "point") {
			map.dragPan.enable();
			map.boxZoom.enable();
			const handleClick = (e) => {
				const { lng, lat } = e.lngLat;
				setSelectedCoords({
					lat,
					lng
				});
				if (markerRef.current) markerRef.current.setLngLat([lng, lat]);
				else markerRef.current = new import_maplibre_gl.default.Marker({ color: "#06b6d4" }).setLngLat([lng, lat]).addTo(map);
			};
			map.on("click", handleClick);
			return () => {
				map.off("click", handleClick);
			};
		} else {
			map.dragPan.disable();
			map.boxZoom.disable();
			const handleMouseDown = (e) => {
				if (e.originalEvent.button !== 0) return;
				isDrawingRef.current = true;
				startLngLatRef.current = e.lngLat;
			};
			const handleMouseMove = (e) => {
				if (!isDrawingRef.current || !startLngLatRef.current) return;
				const start = startLngLatRef.current;
				const current = e.lngLat;
				const minLng = Math.min(start.lng, current.lng);
				const minLat = Math.min(start.lat, current.lat);
				const maxLng = Math.max(start.lng, current.lng);
				const maxLat = Math.max(start.lat, current.lat);
				updateBoxLayer(minLng, minLat, maxLng, maxLat);
			};
			const handleMouseUp = (e) => {
				if (!isDrawingRef.current || !startLngLatRef.current) return;
				isDrawingRef.current = false;
				const start = startLngLatRef.current;
				const current = e.lngLat;
				const minLng = Math.min(start.lng, current.lng);
				const minLat = Math.min(start.lat, current.lat);
				const maxLng = Math.max(start.lng, current.lng);
				const maxLat = Math.max(start.lat, current.lat);
				if (Math.abs(maxLng - minLng) > 1e-4 && Math.abs(maxLat - minLat) > 1e-4) {
					const bbox$1 = bbox(polygon([[
						[minLng, minLat],
						[maxLng, minLat],
						[maxLng, maxLat],
						[minLng, maxLat],
						[minLng, minLat]
					]]));
					setSelectedBbox({
						minLng: bbox$1[0],
						minLat: bbox$1[1],
						maxLng: bbox$1[2],
						maxLat: bbox$1[3]
					});
				}
				startLngLatRef.current = null;
			};
			map.on("mousedown", handleMouseDown);
			map.on("mousemove", handleMouseMove);
			map.on("mouseup", handleMouseUp);
			return () => {
				map.off("mousedown", handleMouseDown);
				map.off("mousemove", handleMouseMove);
				map.off("mouseup", handleMouseUp);
				map.dragPan.enable();
				map.boxZoom.enable();
			};
		}
	}, [
		mode,
		waterMaskBase64,
		analyzedBbox
	]);
	const updateBoxLayer = (minLng, minLat, maxLng, maxLat) => {
		const map = mapRef.current;
		if (!map) return;
		const source = map.getSource("draw-box");
		if (source) source.setData({
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: [[
					[minLng, minLat],
					[maxLng, minLat],
					[maxLng, maxLat],
					[minLng, maxLat],
					[minLng, minLat]
				]]
			}
		});
	};
	const clearBoxLayer = () => {
		const map = mapRef.current;
		if (!map) return;
		const source = map.getSource("draw-box");
		if (source) source.setData({
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: []
			}
		});
	};
	const handleConfirm = async () => {
		let bboxStr = "";
		if (mode === "point" && selectedCoords) {
			const delta = .004;
			bboxStr = `${selectedCoords.lng - delta},${selectedCoords.lat - delta},${selectedCoords.lng + delta},${selectedCoords.lat + delta}`;
		} else if (mode === "box" && selectedBbox) bboxStr = `${selectedBbox.minLng},${selectedBbox.minLat},${selectedBbox.maxLng},${selectedBbox.maxLat}`;
		else return;
		setLoading(true);
		try {
			const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bboxStr}&bboxSR=4326&imageSR=4326&size=512,512&format=jpg&f=image`;
			const response = await fetch(url);
			if (!response.ok) throw new Error("Failed to fetch imagery from Esri World Imagery export service.");
			const blob = await response.blob();
			const filename = `esri_satellite_${Date.now()}.jpg`;
			onConfirm(new File([blob], filename, { type: "image/jpeg" }), selectedCoords, selectedBbox);
		} catch (err) {
			console.error(err);
			alert(err.message || "Failed to capture satellite image. Please try again.");
		} finally {
			setLoading(false);
		}
	};
	const isOverlayMode = !!(waterMaskBase64 && analyzedBbox);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col md:flex-row w-full max-w-5xl h-[calc(100vh-120px)] min-h-[500px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full md:w-[340px] flex-shrink-0 flex flex-col p-5 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800",
			children: [
				isOverlayMode ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-2 w-full",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-cyan-400 font-bold uppercase text-[10px] tracking-widest font-mono",
							children: "⚡ Telemetry Overlay Active"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-slate-100 text-sm font-semibold mt-1",
							children: "Flood Extent Mapping"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-slate-400 mt-1 leading-relaxed",
							children: "Below are the coordinates analyzed for water presence overlay mapping."
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-2.5 w-full",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: mode === "point" ? "default" : "outline",
						size: "sm",
						onClick: () => setMode("point"),
						className: `w-full justify-start text-left py-5 px-4 ${mode === "point" ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "border-slate-700 text-slate-300 hover:bg-slate-900"}`,
						children: "📍 Click a point"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: mode === "box" ? "default" : "outline",
						size: "sm",
						onClick: () => setMode("box"),
						className: `w-full justify-start text-left py-5 px-4 ${mode === "box" ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "border-slate-700 text-slate-300 hover:bg-slate-900"}`,
						children: "⏹ Draw a box"
					})]
				}),
				!isOverlayMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-[11px] text-slate-400 mt-4 font-mono leading-relaxed",
					children: mode === "point" ? "• Click anywhere on the map to drop a point marker." : "• Click and drag your mouse on the map to draw a custom bounding box."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex-grow flex flex-col justify-center my-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-slate-300 font-mono bg-slate-900/60 p-4.5 rounded-lg border border-slate-800/80 w-full min-h-[140px] flex flex-col justify-center",
						children: isOverlayMode && analyzedBbox ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-cyan-400 font-bold uppercase text-[9px] tracking-wider",
								children: "Analyzed Bounds"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-x-2 gap-y-3 mt-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-slate-500 block",
										children: "MIN LAT"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] text-slate-200",
										children: analyzedBbox.minLat.toFixed(5)
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-slate-500 block",
										children: "MIN LNG"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] text-slate-200",
										children: analyzedBbox.minLng.toFixed(5)
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-slate-500 block",
										children: "MAX LAT"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] text-slate-200",
										children: analyzedBbox.maxLat.toFixed(5)
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-slate-500 block",
										children: "MAX LNG"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] text-slate-200",
										children: analyzedBbox.maxLng.toFixed(5)
									})] })
								]
							})]
						}) : mode === "point" && selectedCoords ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-cyan-400 font-bold uppercase text-[9px] tracking-wider",
								children: "Captured Location"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-2 mt-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-slate-500 block",
									children: "LATITUDE"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] text-slate-200",
									children: selectedCoords.lat.toFixed(6)
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-slate-500 block",
									children: "LONGITUDE"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] text-slate-200",
									children: selectedCoords.lng.toFixed(6)
								})] })]
							})]
						}) : mode === "box" && selectedBbox ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-cyan-400 font-bold uppercase text-[9px] tracking-wider",
								children: "Area Coordinates"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-x-2 gap-y-3 mt-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-slate-500 block",
										children: "MIN LAT"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] text-slate-200",
										children: selectedBbox.minLat.toFixed(5)
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-slate-500 block",
										children: "MIN LNG"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] text-slate-200",
										children: selectedBbox.minLng.toFixed(5)
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-slate-500 block",
										children: "MAX LAT"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] text-slate-200",
										children: selectedBbox.maxLat.toFixed(5)
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-slate-500 block",
										children: "MAX LNG"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] text-slate-200",
										children: selectedBbox.maxLng.toFixed(5)
									})] })
								]
							})]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-center w-full py-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-slate-500 italic block",
								children: "No coordinates captured yet."
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] text-slate-600 block mt-1",
								children: "Use map tools to select."
							})]
						})
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-col gap-2 mt-auto w-full pt-4 border-t border-slate-800/80",
					children: isOverlayMode ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: onCancel,
						className: "bg-slate-800 hover:bg-slate-700 text-slate-100 w-full py-5 text-xs font-semibold border border-slate-700",
						children: "Close Overlay View"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: handleConfirm,
						disabled: loading || !selectedCoords && !selectedBbox,
						className: "bg-cyan-600 hover:bg-cyan-700 text-white w-full py-5 text-xs font-semibold",
						children: loading ? "Capturing..." : "Confirm & Import"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: onCancel,
						disabled: loading,
						className: "border-slate-700 text-slate-300 hover:bg-slate-900 w-full py-5 text-xs",
						children: "Cancel"
					})] })
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex-grow h-full w-full relative min-h-[300px] flex flex-col",
			children: [isOverlayMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "bg-slate-950 border-b border-slate-800 p-2.5 flex justify-end items-center z-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => setShowOverlay(!showOverlay),
					className: `text-xs px-4 py-2 font-mono tracking-wider uppercase transition-colors ${showOverlay ? "bg-cyan-600 hover:bg-cyan-700 text-white" : "border border-slate-700 text-slate-300 hover:bg-slate-800"}`,
					children: ["🌊 ", showOverlay ? "Hide Flood Overlay" : "Show Flood Overlay"]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-grow relative w-full h-full",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					ref: mapContainerRef,
					className: "absolute inset-0 w-full h-full"
				})
			})]
		})]
	});
}
var ChatInterface = (0, import_react.memo)(({ messages, status, stageIndex, result, file, previewUrl, chatInput, setChatInput, handleSubmit, handleFile, isStreaming, abortRequest, showHistory, askInsight, insightLoading, handleResetChat, coordinates, setCoordinates, bbox, setBbox }) => {
	const [isMapOpen, setIsMapOpen] = (0, import_react.useState)(false);
	const chatEndRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [
		messages,
		status,
		stageIndex
	]);
	const copyToClipboard = (text) => {
		navigator.clipboard.writeText(text);
	};
	const handleKeyDown = (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "cb-chat-container",
		children: [
			messages.length === 0 && status === "idle" && !showHistory ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "cb-welcome orionix-reveal orionix-in",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cb-hero-orb orb1" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cb-hero-orb orb2" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Analyze Satellite Imagery" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "nebula-text",
						children: "Earth Observation"
					}), " Assistant"] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "cb-suggestions",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setChatInput("Identify bodies of water and calculate total area."),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "sg-icon",
									children: "💧"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "sg-text",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "Water Detection" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Map lakes and rivers" })]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setChatInput("Detect urban encroachment into forest regions."),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "sg-icon",
									children: "🏙️"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "sg-text",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "Urban Sprawl" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Track city expansion" })]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setChatInput("Assess vegetation health and calculate NDVI."),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "sg-icon",
									children: "🌿"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "sg-text",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "Agriculture" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Analyze crop vitality" })]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setChatInput("Analyze road networks, buildings, and industrial infrastructure in the scene."),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "sg-icon",
									children: "🏗️"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "sg-text",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "Infrastructure" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Map built-up zones" })]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setChatInput("Assess possible geological, flooding, or environmental hazards in the area."),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "sg-icon",
									children: "⚠️"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "sg-text",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "Risk Assessment" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Identify hazards" })]
								})]
							})
						]
					})
				]
			}) : !showHistory ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "cb-chat-history",
				children: [
					messages.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `cb-msg-wrapper ${m.role} ${m.isReport ? "report-msg" : ""}`,
						children: [m.role === "assistant" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "cb-msg-avatar",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cb-dot small" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `cb-msg-bubble ${m.role}`,
							children: [m.role === "assistant" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "cb-copy-btn",
								onClick: () => copyToClipboard(m.text),
								title: "Copy to clipboard",
								children: "📋"
							}), m.role === "user" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "cb-msg-text",
								children: m.text
							}) : m.isReport && result ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnalysisResults, {
								result,
								askInsight,
								insightLoading
							}) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "cb-markdown",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Markdown, {
									remarkPlugins: [remarkGfm],
									children: m.text
								})
							})]
						})]
					}, i)),
					status === "running" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PipelineVisualizer, {
						stageIndex,
						status
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: chatEndRef })
				]
			}) : null,
			!showHistory && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "cb-input-area",
				children: [
					file && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "cb-attachment-preview",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: previewUrl,
								alt: "Preview"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "cb-attachment-info",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "cb-attachment-name",
									children: file.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "cb-attachment-size",
									children: [(file.size / 1024 / 1024).toFixed(2), " MB"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "cb-attachment-remove",
								onClick: () => handleFile(null),
								children: "×"
							})
						]
					}),
					result && !file && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							justifyContent: "center",
							marginBottom: "8px"
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "cb-attach-btn",
							style: {
								background: "var(--card)",
								border: "1px solid var(--border)",
								fontSize: "12px",
								padding: "6px 12px",
								height: "32px"
							},
							onClick: handleResetChat,
							children: "🔄 Start New Analysis"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "cb-input-box",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: "cb-attach-btn",
								onClick: () => document.getElementById("file-upload")?.click(),
								title: "Attach Image",
								type: "button",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: { fontSize: "1.1rem" },
									children: "+"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "cb-attach-text",
									children: "Attach"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: "cb-attach-btn",
								onClick: () => setIsMapOpen(true),
								title: "Select Area on Map",
								type: "button",
								style: { borderLeft: "none" },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									style: { fontSize: "1.1rem" },
									children: "🗺️"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "cb-attach-text",
									children: "Map"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "file-upload",
								type: "file",
								accept: "image/png, image/jpeg",
								style: { display: "none" },
								onChange: (e) => handleFile(e.target.files?.[0] || null)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								id: "chat-input-textarea",
								placeholder: file || result ? "Ask a follow-up question..." : "Describe what you want to analyze...",
								value: chatInput,
								onChange: (e) => setChatInput(e.target.value),
								onKeyDown: handleKeyDown,
								rows: Math.min(chatInput.split("\\n").length, 5) || 1
							}),
							isStreaming || status === "running" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "cb-submit-btn cb-stop-btn",
								onClick: abortRequest,
								title: "Stop generation",
								children: "⏹"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "cb-submit-btn",
								onClick: handleSubmit,
								disabled: !chatInput.trim() && !file || status === "running",
								children: "↑"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "cb-footer-text",
						children: "Orionix can make mistakes. Verify critical intelligence."
					})
				]
			}),
			isMapOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapSelector, {
					onConfirm: (capturedFile, coords, bboxVal) => {
						handleFile(capturedFile);
						setCoordinates(coords);
						setBbox(bboxVal);
						setIsMapOpen(false);
					},
					onCancel: () => setIsMapOpen(false),
					waterMaskBase64: result?.water_mask_base64,
					analyzedBbox: result?.bbox && result.bbox.length === 4 ? {
						minLat: result.bbox[0],
						minLng: result.bbox[1],
						maxLat: result.bbox[2],
						maxLng: result.bbox[3]
					} : null
				})
			})
		]
	});
});
ChatInterface.displayName = "ChatInterface";
function OrionixDemo() {
	const { file, previewUrl, status, stageIndex, result, error, messages, sessions, isStreaming, handleFile, handleReset, restoreSession, runAnalysis, askInsight, insightLoading, abortRequest, coordinates, setCoordinates, bbox, setBbox } = useAnalysis();
	const [chatInput, setChatInput] = (0, import_react.useState)("");
	const [showHistory, setShowHistory] = (0, import_react.useState)(false);
	const handleSubmit = () => {
		const prompt = chatInput.trim();
		if (!prompt && !file) return;
		if (file && status !== "running") {
			runAnalysis(prompt);
			setChatInput("");
		} else if (result && status !== "running") {
			askInsight(prompt);
			setChatInput("");
		}
	};
	const handleResetChat = () => {
		handleReset();
		setChatInput("");
		setShowHistory(false);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "cb-root",
		style: { paddingTop: "80px" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { id: "stars" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "orionix-nav",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "orionix-logo",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "orionix-dot" }),
							"Orionix",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "orionix-live",
								children: "● LIVE"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "orionix-links",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/",
							children: "Home"
						}) })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "orionix-tag",
						children: "SIH25170"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "cb-layout",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: "cb-main",
					children: showHistory ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "cb-history-view",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "cb-history-title",
							children: "Session History"
						}), sessions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "cb-history-empty",
							children: "No past sessions found."
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "cb-history-list",
							children: sessions.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "cb-history-card",
								onClick: () => {
									restoreSession(s);
									setShowHistory(false);
								},
								children: [s.previewUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: s.previewUrl,
									alt: "Thumbnail",
									className: "cb-history-thumb"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "cb-history-info",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "cb-history-date",
										children: s.date.toLocaleString()
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "cb-history-desc",
										children: [s.result?.insight?.slice(0, 60) || s.messages[0]?.text?.slice(0, 60) || "Unfinished Session", "..."]
									})]
								})]
							}, s.id))
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						style: { padding: "0 24px" },
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "cb-input-error",
							children: error
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatInterface, {
						messages,
						status,
						stageIndex,
						result,
						file,
						previewUrl,
						chatInput,
						setChatInput,
						handleSubmit,
						handleFile,
						isStreaming,
						abortRequest,
						showHistory,
						askInsight,
						insightLoading,
						handleResetChat,
						coordinates,
						setCoordinates,
						bbox,
						setBbox
					})] })
				})
			})
		]
	});
}
//#endregion
export { OrionixDemo as component };
