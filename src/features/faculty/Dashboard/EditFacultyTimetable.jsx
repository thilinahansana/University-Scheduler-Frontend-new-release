import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Select,
  Input,
  message,
  Spin,
  InputNumber,
  Row,
  Col,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  BookOutlined,
} from "@ant-design/icons";
import {
  getAvailableSpaces,
  submitTimetableChangeRequest,
} from "../../admin/Timetable/timetable.api";
import makeApi from "../../../config/axiosConfig";

const { Option } = Select;
const { TextArea } = Input;

const EditFacultyTimetable = ({ visible, entry, onCancel, onSubmit }) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const { days, periods, spaces, teachers } = useSelector(
    (state) => state.data
  );
  const [loading, setLoading] = useState(false);
  const [requestType, setRequestType] = useState("substitute");
  const [availableSubstitutes, setAvailableSubstitutes] = useState([]);
  const [availableSpaces, setAvailableSpaces] = useState([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [roomDetails, setRoomDetails] = useState(null); // Store full room details
  const [formChanged, setFormChanged] = useState(false); // Track form changes

  useEffect(() => {
    if (visible && entry) {
      form.resetFields();
      setFormChanged(false); // Reset form changed flag when modal opens

      // Format the period for display and internal use
      const periodIds = Array.isArray(entry.period)
        ? entry.period.map((p) => p.name || p)
        : entry.period?.name
        ? [entry.period.name]
        : [];

      const dayName =
        typeof entry.day === "object" ? entry.day.name : entry.day;

      // Extract room information including ID for later use
      const roomName =
        typeof entry.room === "object" ? entry.room.name : entry.room;

      // Store full room details for reference
      if (typeof entry.room === "object") {
        setRoomDetails(entry.room);
      }

      form.setFieldsValue({
        requestType: "substitute",
        subject: entry.subject,
        originalTeacher: entry.teacher,
        room: roomName,
        day: dayName,
        period: periodIds,
        subgroup: Array.isArray(entry.subgroup)
          ? entry.subgroup.join(", ")
          : entry.subgroup,
      });

      // Set state for dependent fields
      setSelectedDay(dayName);
      setSelectedPeriods(periodIds);

      // Filter available teachers who can teach this subject
      filterTeachersBySubject(entry.subject);

      // Pre-fetch available spaces for room changes
      if (dayName && periodIds.length > 0) {
        fetchAvailableSpaces(dayName, periodIds, entry.session_id);
      }
    }
  }, [visible, entry, form, teachers, spaces]);

  useEffect(() => {
    if (visible && entry) {
      // Store initial values when the form is first shown
      const initialValues = {
        requestType: form.getFieldValue("requestType"),
        substitute: form.getFieldValue("substitute"),
        newRoom: form.getFieldValue("newRoom"),
        day: form.getFieldValue("day"),
        period: form.getFieldValue("period"),
        reason: form.getFieldValue("reason"),
      };

      // Store these initial values in a ref to compare later
      form.__INITIAL_VALUES = initialValues;
    }
  }, [visible, entry, form]);

  // Function to check if form has changed - will be called from onValuesChange
  const checkFormChanged = (changedValues, allValues) => {
    if (!form.__INITIAL_VALUES) return;

    const hasReason = !!allValues.reason;

    switch (requestType) {
      case "substitute":
        setFormChanged(!!allValues.substitute && hasReason);
        break;

      case "roomChange":
        setFormChanged(
          allValues.newRoom && allValues.newRoom !== allValues.room && hasReason
        );
        break;

      case "timeChange":
        const dayChanged =
          allValues.day &&
          (typeof entry.day === "object"
            ? allValues.day !== entry.day.name
            : allValues.day !== entry.day);

        const originalPeriods = Array.isArray(entry.period)
          ? entry.period.map((p) => p.name || p)
          : entry.period?.name
          ? [entry.period.name]
          : [];

        const periodsChanged =
          allValues.period &&
          (allValues.period.length !== originalPeriods.length ||
            !allValues.period.every((p) => originalPeriods.includes(p)));

        const roomChanged = !!allValues.newRoom;

        setFormChanged(
          (dayChanged || periodsChanged || roomChanged) && hasReason
        );
        break;

      default:
        break;
    }
  };

  // Function to filter teachers by subject
  const filterTeachersBySubject = (subjectCode) => {
    if (!subjectCode || !teachers) {
      setAvailableSubstitutes([]);
      return;
    }

    const filtered = teachers.filter(
      (teacher) =>
        teacher.id !== entry.teacher && // Not the current teacher
        teacher.subjects &&
        teacher.subjects.includes(subjectCode) // Can teach this subject
    );
    setAvailableSubstitutes(filtered);
  };

  // Fetch available spaces from the backend
  const fetchAvailableSpaces = async (day, periods, excludeSessionId) => {
    setIsLoadingSpaces(true);
    try {
      // Use selected algorithm or default to the published one
      const algorithm = entry.algorithm || "published";

      const response = await dispatch(
        getAvailableSpaces({
          algorithm,
          day,
          periods,
          excludeSessionId,
        })
      ).unwrap();

      setAvailableSpaces(response.available_spaces);
    } catch (error) {
      console.error("Error fetching available spaces:", error);
      message.error("Failed to fetch available rooms");
    } finally {
      setIsLoadingSpaces(false);
    }
  };

  // Handle day change for timeChange requests
  const handleDayChange = (day) => {
    setSelectedDay(day);
    // When day changes, check for available spaces
    const currentPeriods = form.getFieldValue("period");
    if (day && currentPeriods && currentPeriods.length > 0) {
      fetchAvailableSpaces(day, currentPeriods, entry.session_id);
    }
  };

  // Handle period change for timeChange requests
  const handlePeriodChange = (periods) => {
    setSelectedPeriods(periods);
    // When periods change, check for available spaces
    const currentDay =
      form.getFieldValue("day") || entry.day?.name || entry.day;
    if (currentDay && periods.length > 0) {
      fetchAvailableSpaces(currentDay, periods, entry.session_id);
    }
  };

  const handleRequestTypeChange = (value) => {
    setRequestType(value);
    // Reset relevant fields based on new request type
    if (value === "substitute") {
      form.setFieldsValue({ substitute: undefined });
    } else if (value === "roomChange") {
      form.setFieldsValue({ newRoom: undefined });
    } else if (value === "timeChange") {
      const dayName =
        typeof entry.day === "object" ? entry.day.name : entry.day;
      const periodIds = Array.isArray(entry.period)
        ? entry.period.map((p) => p.name || p)
        : entry.period?.name
        ? [entry.period.name]
        : [];

      form.setFieldsValue({
        day: dayName,
        period: periodIds,
        newRoom: undefined,
      });
    }

    // Also reset reason
    form.setFieldsValue({ reason: undefined });
    setFormChanged(false);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      // Prepare common request data
      const requestData = {
        type: values.requestType,
        session_id: entry.session_id,
        timetable_id: entry.timetable_id,
        semester: entry.semester,
        reason: values.reason || "",
      };

      // Add type-specific fields
      if (values.requestType === "substitute") {
        requestData.substitute = values.substitute;
      } else if (values.requestType === "roomChange") {
        // For room changes, include selected room details
        const selectedRoom = availableSpaces.find(
          (room) => room.name === values.newRoom
        );

        if (selectedRoom) {
          requestData.new_room = values.newRoom;
          requestData.room_id = selectedRoom._id;
          requestData.room_details = selectedRoom;
        } else {
          requestData.new_room = values.newRoom;
        }
      } else if (values.requestType === "timeChange") {
        requestData.new_day = values.day;

        // Ensure new_periods is an array of period names
        if (Array.isArray(values.period)) {
          requestData.new_periods = values.period;

          // If we need period details for the backend processing
          const periodDetails = values.period.map((periodName) => {
            const period = periods?.find((p) => p.name === periodName);
            return period
              ? {
                  _id: period._id,
                  name: period.name,
                  long_name: period.long_name,
                  is_interval: period.is_interval || false,
                  created_at: period.created_at,
                  updated_at: period.updated_at,
                  index: period.index || 0,
                }
              : { name: periodName };
          });

          // Sort periods by index to maintain correct order
          periodDetails.sort((a, b) => (a.index || 0) - (b.index || 0));

          // For reference in backend processing
          requestData.period_details = periodDetails;
        }

        // Only include new_room if it was provided
        if (values.newRoom) {
          const selectedRoom = availableSpaces.find(
            (room) => room.name === values.newRoom
          );
          if (selectedRoom) {
            requestData.new_room = values.newRoom;
            requestData.room_id = selectedRoom._id;
            requestData.room_details = selectedRoom;
          } else {
            requestData.new_room = values.newRoom;
          }
        }
      }

      console.log("Submitting request data:", requestData);

      // Submit the request using the API
      const response = await dispatch(
        submitTimetableChangeRequest(requestData)
      ).unwrap();

      console.log("Request submission response:", response);

      if (response && response.success) {
        message.success("Your request has been submitted successfully");
        onSubmit(requestData);
      } else {
        throw new Error(response?.message || "Failed to submit request");
      }
    } catch (error) {
      console.error("Request submission failed:", error);
      message.error(`Failed to submit request: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Render different form fields based on request type
  const renderRequestTypeFields = () => {
    switch (requestType) {
      case "substitute":
        return (
          <>
            <Form.Item label="Current Teacher" name="originalTeacher">
              <Input prefix={<UserOutlined />} disabled />
            </Form.Item>

            <Form.Item
              name="substitute"
              label="Select Substitute Teacher"
              rules={[
                {
                  required: true,
                  message: "Please select a substitute teacher",
                },
              ]}
            >
              <Select
                placeholder="Select a substitute teacher"
                loading={!availableSubstitutes}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >=
                  0
                }
              >
                {availableSubstitutes.map((teacher) => (
                  <Option key={teacher.id} value={teacher.id}>
                    {`${teacher.first_name} ${teacher.last_name} (${
                      teacher.position || "Faculty"
                    })`}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </>
        );

      case "roomChange":
        return (
          <>
            <Form.Item label="Current Room" name="room">
              <Input prefix={<EnvironmentOutlined />} disabled />
            </Form.Item>

            <Form.Item
              name="newRoom"
              label={
                <span>New Room {isLoadingSpaces && <Spin size="small" />}</span>
              }
              rules={[{ required: true, message: "Please select a new room" }]}
            >
              <Select
                showSearch
                loading={isLoadingSpaces}
                placeholder={
                  isLoadingSpaces
                    ? "Loading available rooms..."
                    : "Select a new room"
                }
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >=
                  0
                }
              >
                {availableSpaces.map((room) => (
                  <Option key={room.name} value={room.name}>
                    {`${room.long_name || room.name} ${
                      room.code ? `(${room.code})` : ""
                    } ${room.capacity ? `- Capacity: ${room.capacity}` : ""}`}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </>
        );

      case "timeChange":
        return (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Current Day">
                  <Input
                    prefix={<CalendarOutlined />}
                    value={
                      typeof entry.day === "object" ? entry.day.name : entry.day
                    }
                    disabled
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Current Period">
                  <Input
                    prefix={<ClockCircleOutlined />}
                    value={
                      Array.isArray(entry.period)
                        ? entry.period.map((p) => p.name || p).join(", ")
                        : entry.period?.name || ""
                    }
                    disabled
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="day"
                  label="New Day"
                  rules={[{ required: true, message: "Please select a day" }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="children"
                    onChange={handleDayChange}
                    filterOption={(input, option) =>
                      option.children
                        .toLowerCase()
                        .indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {days?.map((day) => (
                      <Option key={day.name} value={day.name}>
                        {day.long_name || day.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="period"
                  label="New Periods"
                  rules={[{ required: true, message: "Please select periods" }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Select time periods"
                    showSearch
                    onChange={handlePeriodChange}
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option.children
                        .toLowerCase()
                        .indexOf(input.toLowerCase()) >= 0
                    }
                  >
                    {periods?.map((period) => (
                      <Option key={period.name} value={period.name}>
                        {period.long_name || period.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Make room selection optional for time changes */}
            <Form.Item
              name="newRoom"
              label={
                <span>
                  New Room (Optional) {isLoadingSpaces && <Spin size="small" />}
                </span>
              }
            >
              <Select
                showSearch
                loading={isLoadingSpaces}
                placeholder={
                  isLoadingSpaces
                    ? "Loading available rooms..."
                    : "Select a room (optional)"
                }
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >=
                  0
                }
                allowClear
              >
                {availableSpaces.map((room) => (
                  <Option key={room.name} value={room.name}>
                    {`${room.long_name || room.name} ${
                      room.code ? `(${room.code})` : ""
                    } ${room.capacity ? `- Capacity: ${room.capacity}` : ""}`}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title="Request Timetable Change"
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      okButtonProps={{ disabled: !formChanged || loading }}
      width={600}
    >
      <Form form={form} layout="vertical" onValuesChange={checkFormChanged}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Subject" name="subject">
              <Input prefix={<BookOutlined />} disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Class" name="subgroup">
              <Input prefix={<TeamOutlined />} disabled />
            </Form.Item>
          </Col>
        </Row>

        {/* Request type selection */}
        <Form.Item
          label="Request Type"
          name="requestType"
          rules={[{ required: true, message: "Please select a request type" }]}
        >
          <Select onChange={handleRequestTypeChange}>
            <Option value="substitute">Request Substitute Teacher</Option>
            <Option value="roomChange">Request Room Change</Option>
            <Option value="timeChange">Request Time/Day Change</Option>
          </Select>
        </Form.Item>

        {/* Render different fields based on request type */}
        {renderRequestTypeFields()}

        {/* Reason is required for all request types */}
        <Form.Item
          name="reason"
          label={`Reason for ${
            requestType === "substitute"
              ? "Substitution"
              : requestType === "roomChange"
              ? "Room Change"
              : "Time/Day Change"
          }`}
          rules={[
            {
              required: true,
              message: "Please provide a reason for your request",
            },
          ]}
        >
          <TextArea
            rows={4}
            placeholder={`Please explain why you need this ${
              requestType === "substitute"
                ? "substitute teacher"
                : requestType === "roomChange"
                ? "room change"
                : "schedule change"
            }`}
          />
        </Form.Item>

        <div style={{ marginTop: 16 }}>
          <p>
            <strong>Note:</strong> Your request will be sent to the
            administrator for approval. You will be notified once it has been
            reviewed.
          </p>
        </div>
      </Form>
    </Modal>
  );
};

export default EditFacultyTimetable;
