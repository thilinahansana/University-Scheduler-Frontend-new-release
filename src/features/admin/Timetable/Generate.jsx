import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Spin,
  notification,
  Progress,
  Badge,
  Divider,
  Card,
  Typography,
  Row,
  Col,
} from "antd";
import {
  LoadingOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  InfoCircleFilled,
  ThunderboltOutlined,
  CodeOutlined,
  RobotOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { generateTimetable, setNotificationRead } from "./timetable.api";
import { useDispatch, useSelector } from "react-redux";
import { setGenerating } from "./timetable.slice";

const { Title, Text } = Typography;

// Algorithm metadata for UI presentation
const algorithmMeta = {
  GA: {
    name: "Genetic Algorithm",
    icon: <ThunderboltOutlined />,
    color: "#8e44ad",
    description: "Evolutionary approach that mimics natural selection",
    detailLabels: {
      population: "Population",
      iterations: "Iterations",
      fitness: "Fitness",
    },
  },
  CO: {
    name: "Constraint Optimization",
    icon: <CodeOutlined />,
    color: "#e67e22",
    description: "Solves problems by satisfying constraints",
    detailLabels: {
      constraints: "Constraints",
      violated: "Violated",
    },
  },
  RL: {
    name: "Reinforcement Learning",
    icon: <RobotOutlined />,
    color: "#3498db",
    description: "Learning through reward-based feedback",
    detailLabels: {
      episodes: "Episodes",
      reward: "Reward",
    },
  },
};

export default function Generate() {
  const { generating } = useSelector((state) => state.timetable);
  const dispatch = useDispatch();

  const [prevGenerating, setPrevGenerating] = useState(false);
  const [NotificationShown, setNotificationShown] = useState(false);
  const [progressLogs, setProgressLogs] = useState([]);
  const [algoComplete, setAlgoComplete] = useState(false);
  const [currentAlgorithm, setCurrentAlgorithm] = useState(null);
  const [algorithmStatus, setAlgorithmStatus] = useState({
    GA: { status: "pending", details: {} },
    CO: { status: "pending", details: {} },
    RL: { status: "pending", details: {} },
  });

  // Reference to the log container for auto-scrolling
  const logContainerRef = useRef(null);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [progressLogs]);

  // Debug logging for state changes
  useEffect(() => {
    console.log(
      "State change: generating =",
      generating,
      "algoComplete =",
      algoComplete
    );
  }, [generating, algoComplete]);

  // Process log message to extract useful information
  const processLogMessage = (message) => {
    // Check for algorithm start
    if (message.includes("Starting Genetic Algorithm execution")) {
      setCurrentAlgorithm("GA");
      setAlgorithmStatus((prev) => ({
        ...prev,
        GA: { ...prev.GA, status: "running" },
      }));
    } else if (
      message.includes("Starting Constraint Optimization Algorithm execution")
    ) {
      setCurrentAlgorithm("CO");
      setAlgorithmStatus((prev) => ({
        ...prev,
        CO: { ...prev.CO, status: "running" },
      }));
    } else if (
      message.includes("Starting Reinforcement Learning Algorithm execution")
    ) {
      setCurrentAlgorithm("RL");
      setAlgorithmStatus((prev) => ({
        ...prev,
        RL: { ...prev.RL, status: "running" },
      }));
    }

    // Check for algorithm completion
    if (message.includes("Genetic Algorithm completed - Success: true")) {
      setAlgorithmStatus((prev) => ({
        ...prev,
        GA: { ...prev.GA, status: "success" },
      }));
    } else if (
      message.includes("Genetic Algorithm completed - Success: false")
    ) {
      setAlgorithmStatus((prev) => ({
        ...prev,
        GA: { ...prev.GA, status: "failed" },
      }));
    } else if (
      message.includes("Constraint Algorithm completed - Success: true")
    ) {
      setAlgorithmStatus((prev) => ({
        ...prev,
        CO: { ...prev.CO, status: "success" },
      }));
    } else if (
      message.includes("Constraint Algorithm completed - Success: false")
    ) {
      setAlgorithmStatus((prev) => ({
        ...prev,
        CO: { ...prev.CO, status: "failed" },
      }));
    } else if (
      message.includes("Reinforcement Learning completed - Success: true")
    ) {
      setAlgorithmStatus((prev) => ({
        ...prev,
        RL: { ...prev.RL, status: "success" },
      }));
    } else if (
      message.includes("Reinforcement Learning completed - Success: false")
    ) {
      setAlgorithmStatus((prev) => ({
        ...prev,
        RL: { ...prev.RL, status: "failed" },
      }));
    }

    // Extract population and iteration info for GA
    if (currentAlgorithm === "GA") {
      const populationMatch = message.match(/Population size: (\d+)/);
      const iterationMatch = message.match(/Iterations: (\d+)/);
      const fitnessMatch = message.match(/Best fitness: ([\d.]+)/);

      if (populationMatch) {
        setAlgorithmStatus((prev) => ({
          ...prev,
          GA: {
            ...prev.GA,
            details: {
              ...prev.GA.details,
              population: populationMatch[1],
            },
          },
        }));
      }

      if (iterationMatch) {
        setAlgorithmStatus((prev) => ({
          ...prev,
          GA: {
            ...prev.GA,
            details: {
              ...prev.GA.details,
              iterations: iterationMatch[1],
            },
          },
        }));
      }

      if (fitnessMatch) {
        setAlgorithmStatus((prev) => ({
          ...prev,
          GA: {
            ...prev.GA,
            details: {
              ...prev.GA.details,
              fitness: fitnessMatch[1],
            },
          },
        }));
      }
    }

    // Extract constraint info for CO
    if (currentAlgorithm === "CO") {
      const constraintsMatch = message.match(/Constraints: (\d+)/);
      const violatedMatch = message.match(/Violated: (\d+)/);

      if (constraintsMatch) {
        setAlgorithmStatus((prev) => ({
          ...prev,
          CO: {
            ...prev.CO,
            details: {
              ...prev.CO.details,
              constraints: constraintsMatch[1],
            },
          },
        }));
      }

      if (violatedMatch) {
        setAlgorithmStatus((prev) => ({
          ...prev,
          CO: {
            ...prev.CO,
            details: {
              ...prev.CO.details,
              violated: violatedMatch[1],
            },
          },
        }));
      }
    }

    // Extract training info for RL
    if (currentAlgorithm === "RL") {
      const episodesMatch = message.match(/Episodes: (\d+)/);
      const rewardMatch = message.match(/Reward: ([\d.]+)/);

      if (episodesMatch) {
        setAlgorithmStatus((prev) => ({
          ...prev,
          RL: {
            ...prev.RL,
            details: {
              ...prev.RL.details,
              episodes: episodesMatch[1],
            },
          },
        }));
      }

      if (rewardMatch) {
        setAlgorithmStatus((prev) => ({
          ...prev,
          RL: {
            ...prev.RL,
            details: {
              ...prev.RL.details,
              reward: rewardMatch[1],
            },
          },
        }));
      }
    }
  };

  useEffect(() => {
    let eventSource;

    if (generating && !algoComplete) {
      console.log(" Connecting to SSE stream...");

      // Force notification state to false when generation starts
      setNotificationShown(false);

      // Reset algorithm status
      setAlgorithmStatus({
        GA: { status: "pending", details: {} },
        CO: { status: "pending", details: {} },
        RL: { status: "pending", details: {} },
      });

      eventSource = new EventSource(
        "http://localhost:8000/api/v1/timetable/progress-stream"
      );

      eventSource.onopen = () => {
        console.log(" SSE connection opened");
      };

      eventSource.onerror = (error) => {
        console.error(" SSE connection error:", error);

        // Close and retry connection if there's an error
        if (eventSource) {
          eventSource.close();
          console.log(" Retrying SSE connection in 2 seconds...");
          setTimeout(() => {
            if (generating && !algoComplete) {
              eventSource = new EventSource(
                "http://localhost:8000/api/v1/timetable/progress-stream"
              );
            }
          }, 2000);
        }
      };

      eventSource.onmessage = (event) => {
        console.log(" SSE message received:", event.data);
        try {
          const log = JSON.parse(event.data);

          // Process the log message to extract useful information
          if (log.message) {
            processLogMessage(log.message);
          }

          // Filter out unnecessary logs
          if (
            !log.message.includes("HTTP/1.1") &&
            !log.message.includes("127.0.0.1") &&
            !log.message.includes("INFO:") &&
            !log.message.includes(
              "--------------------------------------------------"
            )
          ) {
            setProgressLogs((prev) => [...prev, log]);
          }

          // Only show completion notification when we get the final success message
          // Updated to match the new format from the backend
          if (
            log.message &&
            log.message.includes("Schedule generated successfully with")
          ) {
            console.log(" Timetable generation completed successfully!");
            setAlgoComplete(true);

            // Important: Use the Redux action to set generating to false
            dispatch(setGenerating(false));

            // Extract which algorithms succeeded
            const numSuccess = log.message.match(/with (\d+) of 3 algorithms/);
            const numSuccessful = numSuccess ? numSuccess[1] : "at least one";

            // Different notification based on how many algorithms succeeded
            notification.success({
              message: "Timetable Generation Complete",
              description: `${numSuccessful} of 3 algorithms successfully generated timetables. Switch to the View tab to see the results.`,
              duration: 8,
            });

            setNotificationShown(true);
            eventSource.close();
          }
        } catch (error) {
          console.error("Error processing SSE message:", error);
        }
      };
    }

    return () => {
      if (eventSource) {
        console.log(" Closing SSE connection");
        eventSource.close();
      }
    };
  }, [generating, algoComplete, dispatch]);

  const genTimetable = () => {
    console.log(" Starting timetable generation");
    setNotificationShown(false);
    setAlgoComplete(false);
    setProgressLogs([]);
    setCurrentAlgorithm(null);
    dispatch(generateTimetable());
  };

  const targetText = "Generating Timetable...";
  const randomChars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const [displayedText, setDisplayedText] = useState(
    Array(targetText.length).fill(" ")
  );
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);

  useEffect(() => {
    // Only show notification when algo is actually complete (from SSE stream)
    // Not just when generating state changes
    if (prevGenerating && !generating) {
      console.log(" Generation state changed from true to false");

      // Reset animation state
      setCurrentLetterIndex(0);
      setDisplayedText(Array(targetText.length).fill(" "));
    }

    // Update previous generating state
    setPrevGenerating(generating);
  }, [generating, prevGenerating, targetText]);

  // Keep the existing animation effect
  useEffect(() => {
    if (!generating) return; // Don't run animation if not generating

    // If we've reached the end, start over
    if (currentLetterIndex >= targetText.length) {
      setCurrentLetterIndex(0);
      return;
    }

    // Random character animation timer
    const timer = setInterval(() => {
      const newText = [...displayedText];

      if (currentLetterIndex < targetText.length) {
        // Generate random character
        newText[currentLetterIndex] = randomChars.charAt(
          Math.floor(Math.random() * randomChars.length)
        );
        setDisplayedText(newText);
      }
    }, 50);

    // Timer to advance to next letter
    const finalizeTimer = setTimeout(() => {
      const newText = [...displayedText];
      if (currentLetterIndex < targetText.length) {
        newText[currentLetterIndex] = targetText[currentLetterIndex];
        setDisplayedText(newText);
        setCurrentLetterIndex(currentLetterIndex + 1);
      }
    }, 500);

    return () => {
      clearInterval(timer);
      clearTimeout(finalizeTimer);
    };
  }, [currentLetterIndex, generating, randomChars, targetText]);

  // Get progress percentage for algorithms
  const getAlgorithmProgress = (algorithm) => {
    const status = algorithmStatus[algorithm].status;
    const details = algorithmStatus[algorithm].details;

    if (status === "success") return 100;
    if (status === "failed") return 100;
    if (status === "pending") return 0;

    // For running algorithms, try to estimate progress
    if (algorithm === "GA" && details.iterations) {
      // Assuming max 100 iterations for GA
      return Math.min(parseInt(details.iterations || 0, 10), 100);
    }
    if (algorithm === "RL" && details.episodes) {
      // Assuming max 100 episodes for RL
      return Math.min(parseInt(details.episodes || 0, 10), 100);
    }

    // Default progress for running algorithms with no measurable progress
    return 33;
  };

  // Get status color for an algorithm
  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "#52c41a";
      case "failed":
        return "#f5222d";
      case "running":
        return "#1890ff";
      default:
        return "#8c8c8c";
    }
  };

  // Get animation class based on algorithm status
  const getAnimationClass = (status) => {
    return status === "running" ? "pulse-animation" : "";
  };

  // Get status icon for an algorithm
  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircleFilled style={{ color: "#52c41a" }} />;
      case "failed":
        return <CloseCircleFilled style={{ color: "#f5222d" }} />;
      case "running":
        return <LoadingOutlined style={{ color: "#1890ff" }} />;
      default:
        return <InfoCircleFilled style={{ color: "#8c8c8c" }} />;
    }
  };

  // Get color for log message
  const getLogColor = (message) => {
    if (message.includes("ERROR") || message.includes("failed")) {
      return "#f5222d"; // Red for errors
    } else if (message.includes("WARNING")) {
      return "#faad14"; // Yellow for warnings
    } else if (message.includes("success") || message.includes("complete")) {
      return "#52c41a"; // Green for success
    } else if (message.includes("Starting")) {
      return "#1890ff"; // Blue for starting
    } else {
      return "#d9d9d9"; // Default gray
    }
  };

  return (
    <div className="timetable-generator-container">
      <div className="generator-header">
        <BarChartOutlined className="generator-icon" />
        <Title level={2} className="generator-title">
          Timetable Generator
        </Title>
        <Text type="secondary" className="generator-subtitle">
          Generate optimized timetables using multiple AI algorithms
        </Text>
      </div>

      {!generating ? (
        <div className="generate-button-container">
          <Button
            type="primary"
            size="large"
            className="generate-button"
            onClick={genTimetable}
            icon={<ThunderboltOutlined />}
          >
            Generate Timetables
          </Button>
          <Text type="secondary" className="mt-4 block">
            This will run all scheduling algorithms and may take a few minutes
          </Text>
        </div>
      ) : (
        <div className="generation-content">
          <div className="generating-text-container">
            <div className="generating-text">{displayedText.join("")}</div>
            <div className="generating-subtitle">
              <ClockCircleOutlined /> Generation in progress...
            </div>
          </div>

          {/* Algorithm Status Cards */}
          <Row gutter={[16, 16]} className="algorithm-cards">
            {Object.entries(algorithmStatus).map(([algo, data]) => (
              <Col xs={24} md={8} key={algo}>
                <Card
                  className={`algorithm-status-card ${getAnimationClass(
                    data.status
                  )}`}
                  style={{
                    borderTopColor: algorithmMeta[algo].color,
                    borderTopWidth: "3px",
                  }}
                >
                  <div className="algorithm-header">
                    <div className="algorithm-title">
                      {algorithmMeta[algo].icon}
                      <span>{algorithmMeta[algo].name}</span>
                    </div>
                    <Badge
                      count={getStatusIcon(data.status)}
                      className="algorithm-status-badge"
                    />
                  </div>

                  <div className="algorithm-description">
                    {algorithmMeta[algo].description}
                  </div>

                  <Progress
                    percent={getAlgorithmProgress(algo)}
                    status={
                      data.status === "success"
                        ? "success"
                        : data.status === "failed"
                        ? "exception"
                        : "active"
                    }
                    strokeColor={getStatusColor(data.status)}
                    className="algorithm-progress"
                  />

                  <div className="algorithm-details">
                    {Object.entries(data.details).map(([key, value]) => (
                      <div key={key} className="detail-item">
                        <span className="detail-label">
                          {algorithmMeta[algo].detailLabels[key] || key}
                        </span>
                        <span className="detail-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Terminal-like Log Display */}
          <Card className="terminal-container">
            <div className="terminal-header">
              <div className="terminal-buttons">
                <span className="terminal-button red"></span>
                <span className="terminal-button yellow"></span>
                <span className="terminal-button green"></span>
              </div>
              <div className="terminal-title">
                <CodeOutlined /> Generation Logs
              </div>
              <div className="terminal-info">
                {currentAlgorithm
                  ? `${algorithmMeta[currentAlgorithm]?.name}`
                  : "Initializing..."}
              </div>
            </div>
            <div ref={logContainerRef} className="terminal-content">
              {progressLogs.length === 0 ? (
                <div className="terminal-waiting">
                  <LoadingOutlined spin /> Waiting for progress updates...
                </div>
              ) : (
                progressLogs.map((log, index) => (
                  <div
                    key={index}
                    className="log-entry"
                    style={{ color: getLogColor(log.message) }}
                  >
                    <span className="log-time">
                      {new Date().toLocaleTimeString()} &gt;
                    </span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      <style jsx="true">{`
        .timetable-generator-container {
          background: linear-gradient(to bottom, #ffffff, #f5f8ff);
          padding: 32px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          max-width: 1200px;
          margin: 0 auto;
          overflow: hidden;
          min-height: 500px;
        }

        .generator-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .generator-icon {
          font-size: 48px;
          color: #1677ff;
          margin-bottom: 16px;
        }

        .generator-title {
          margin: 0 0 8px 0 !important;
          color: #111;
        }

        .generator-subtitle {
          font-size: 16px;
          color: #666;
        }

        .generate-button-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 0;
        }

        .generate-button {
          height: 56px;
          font-size: 18px;
          padding: 0 40px;
          border-radius: 28px;
          background: linear-gradient(45deg, #1677ff, #6aa0ff);
          border: none;
          box-shadow: 0 8px 16px rgba(22, 119, 255, 0.25);
          transition: all 0.3s ease;
        }

        .generate-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(22, 119, 255, 0.3);
          background: linear-gradient(45deg, #0d6efd, #5094ff);
        }

        .generation-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .generating-text-container {
          text-align: center;
          margin-bottom: 16px;
        }

        .generating-text {
          font-family: "Courier New", monospace;
          font-size: 24px;
          font-weight: 500;
          background: linear-gradient(90deg, #1677ff, #6aa0ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: pulse 1.5s infinite;
          min-height: 36px;
        }

        .generating-subtitle {
          margin-top: 8px;
          color: #666;
          font-size: 14px;
        }

        .algorithm-cards {
          margin: 0 -8px;
        }

        .algorithm-status-card {
          height: 100%;
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .algorithm-status-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
        }

        .algorithm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .algorithm-title {
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .algorithm-description {
          color: #666;
          font-size: 14px;
          margin-bottom: 16px;
          min-height: 40px;
        }

        .algorithm-progress {
          margin-bottom: 16px;
        }

        .algorithm-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .detail-label {
          color: #666;
        }

        .detail-value {
          font-weight: 500;
          color: #111;
        }

        .terminal-container {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          background-color: #1e1e1e;
          margin-top: 16px;
        }

        .terminal-header {
          background-color: #333;
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #444;
        }

        .terminal-buttons {
          display: flex;
          gap: 6px;
        }

        .terminal-button {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
        }

        .terminal-button.red {
          background-color: #ff5f56;
        }

        .terminal-button.yellow {
          background-color: #ffbd2e;
        }

        .terminal-button.green {
          background-color: #27c93f;
        }

        .terminal-title {
          color: #ddd;
          font-family: "Courier New", monospace;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .terminal-info {
          color: #ccc;
          font-size: 12px;
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }

        .terminal-content {
          height: 300px;
          overflow-y: auto;
          padding: 16px;
          font-family: "Courier New", monospace;
          font-size: 14px;
          line-height: 1.5;
        }

        .terminal-waiting {
          color: #888;
          font-style: italic;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .log-entry {
          margin-bottom: 6px;
          word-break: break-word;
        }

        .log-time {
          color: #888;
          margin-right: 8px;
          font-size: 12px;
        }

        .log-message {
          font-size: 13px;
        }

        /* Animations */
        @keyframes pulse {
          0% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0.6;
          }
        }

        .pulse-animation {
          animation: pulse 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
