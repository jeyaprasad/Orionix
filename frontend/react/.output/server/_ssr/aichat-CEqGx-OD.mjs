import { a as __toESM } from "../_runtime.mjs";
import { n as AnimatePresence, t as motion } from "../_libs/framer-motion.mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { h as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import "./router-CfTm7ec8.mjs";
import { t as imageCompression } from "../_libs/browser-image-compression.mjs";
import { t as Markdown } from "../_libs/react-markdown+[...].mjs";
import { t as remarkGfm } from "../_libs/remark-gfm.mjs";
import { t as m } from "../_libs/react-error-boundary.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/aichat-CEqGx-OD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
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
		}, [file]),
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
var ChatInterface = (0, import_react.memo)(({ messages, status, stageIndex, result, file, previewUrl, chatInput, setChatInput, handleSubmit, handleFile, isStreaming, abortRequest, showHistory, askInsight, insightLoading, handleResetChat }) => {
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
		children: [messages.length === 0 && status === "idle" && !showHistory ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
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
		}) : null, !showHistory && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
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
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								style: { fontSize: "1.1rem" },
								children: "+"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "cb-attach-text",
								children: "Attach"
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
		})]
	});
});
ChatInterface.displayName = "ChatInterface";
function OrionixDemo() {
	const { file, previewUrl, status, stageIndex, result, error, messages, sessions, isStreaming, handleFile, handleReset, restoreSession, runAnalysis, askInsight, insightLoading, abortRequest } = useAnalysis();
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
						handleResetChat
					})] })
				})
			})
		]
	});
}
//#endregion
export { OrionixDemo as component };
