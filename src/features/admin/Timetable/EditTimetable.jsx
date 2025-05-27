import React, { useState, useEffect } from "react";
import { Modal, Form, Select, InputNumber, message, Spin } from "antd";
import { useSelector, useDispatch } from "react-redux";
import { getAvailableSpaces } from "./timetable.api";

const EditTimetableModal = ({
  visible,
  onCancel,
  onSubmit,
  initialData,
  timetableId,
  algorithm,
}) => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const { days, periods, subjects, teachers, spaces } = useSelector(
    (state) => state.data
  );
  const [loading, setLoading] = useState(false);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [availableSpaces, setAvailableSpaces] = useState([]);
  const [isLoadingSpaces, setIsLoadingSpaces] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [selectedDuration, setSelectedDuration] = useState(1);

  useEffect(() => {
    if (visible && initialData) {
      // Convert subgroup to array if it's not already
      const subgroupValue = Array.isArray(initialData.subgroup)
        ? initialData.subgroup
        : initialData.subgroup
        ? [initialData.subgroup]
        : [];

      const initialPeriods = initialData.period.map((p) => p.name || p);

      // Handle day value - extract name if it's an object
      const dayValue =
        typeof initialData.day === "object" && initialData.day !== null
          ? initialData.day.name
          : initialData.day;

      form.setFieldsValue({
        subgroup: subgroupValue,
        subject: initialData.subject,
        teacher: initialData.teacher,
        room:
          typeof initialData.room === "object"
            ? initialData.room.name
            : initialData.room,
        day: dayValue,
        period: initialPeriods, // Array of period names
        duration: initialData.duration,
      });

      // Initialize filtered teachers based on the selected subject
      filterTeachersBySubject(initialData.subject);

      // Store initial selections
      setSelectedDay(dayValue);
      setSelectedPeriods(initialPeriods);
      setSelectedDuration(initialData.duration);

      // Fetch available spaces based on initial selection
      if (dayValue && initialPeriods.length > 0) {
        fetchAvailableSpaces(
          algorithm,
          dayValue,
          initialPeriods,
          initialData.session_id
        );
      }
    }
  }, [visible, initialData, form, teachers, algorithm]);

  // Function to filter teachers by subject
  const filterTeachersBySubject = (subjectCode) => {
    if (!subjectCode || !teachers) {
      setFilteredTeachers([]);
      return;
    }

    const filtered = teachers.filter(
      (teacher) => teacher.subjects && teacher.subjects.includes(subjectCode)
    );
    setFilteredTeachers(filtered);
  };

  // Handle subject change
  const handleSubjectChange = (value) => {
    filterTeachersBySubject(value);
    // Clear teacher selection if current teacher doesn't teach the new subject
    const currentTeacher = form.getFieldValue("teacher");
    const teacherStillValid = filteredTeachers.some(
      (t) => t.id === currentTeacher
    );

    if (!teacherStillValid) {
      form.setFieldsValue({ teacher: undefined });
    }
  };

  // Handle day change
  const handleDayChange = (day) => {
    setSelectedDay(day);
    // When day changes, check for available spaces
    const currentPeriods = form.getFieldValue("period");
    if (day && currentPeriods && currentPeriods.length > 0) {
      fetchAvailableSpaces(
        algorithm,
        day,
        currentPeriods,
        initialData?.session_id
      );
    }
  };

  // Handle period change
  const handlePeriodChange = (periods) => {
    setSelectedPeriods(periods);

    // Update form duration if needed to match period count
    const currentDuration = form.getFieldValue("duration");
    if (periods.length !== currentDuration) {
      form.setFieldsValue({ duration: periods.length });
      setSelectedDuration(periods.length);
    }

    // When periods change, check for available spaces
    const currentDay = form.getFieldValue("day");
    if (currentDay && periods.length > 0) {
      fetchAvailableSpaces(
        algorithm,
        currentDay,
        periods,
        initialData?.session_id
      );
    }
  };

  // Handle duration change
  const handleDurationChange = (duration) => {
    setSelectedDuration(duration);
    // Clear period selection if it doesn't match the new duration
    const currentPeriods = form.getFieldValue("period");
    if (currentPeriods && currentPeriods.length !== duration) {
      form.setFieldsValue({ period: [] });
      setSelectedPeriods([]);
    }
  };

  // Fetch available spaces from the backend
  const fetchAvailableSpaces = async (
    algorithm,
    day,
    periods,
    excludeSessionId
  ) => {
    setIsLoadingSpaces(true);
    try {
      const response = await dispatch(
        getAvailableSpaces({
          algorithm,
          day,
          periods,
          excludeSessionId,
        })
      ).unwrap();

      setAvailableSpaces(response.available_spaces);

      // Check if currently selected room is still available
      const currentRoom = form.getFieldValue("room");
      const isCurrentRoomAvailable = response.available_spaces.some(
        (space) => space.name === currentRoom
      );

      // If current room is not available, clear the selection
      if (
        !isCurrentRoomAvailable &&
        currentRoom &&
        response.occupied_spaces.includes(currentRoom)
      ) {
        form.setFieldsValue({ room: undefined });
        message.warning(
          "The previously selected room is not available for the selected time slot."
        );
      }
    } catch (error) {
      console.error("Error fetching available spaces:", error);
      message.error("Failed to fetch available spaces");
    } finally {
      setIsLoadingSpaces(false);
    }
  };

  // Validate that the number of periods matches the duration
  const validatePeriods = (_, value) => {
    const duration = form.getFieldValue("duration");
    if (!value || !duration) {
      return Promise.resolve();
    }

    if (value.length !== duration) {
      return Promise.reject(
        new Error(
          `Please select exactly ${duration} periods to match the duration`
        )
      );
    }

    return Promise.resolve();
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      // Find full objects from the selected values
      const selectedDay = days.find((d) => d.name === values.day);
      const selectedRoom = spaces.find((s) => s.name === values.room);
      const selectedPeriods = periods.filter((p) =>
        values.period.includes(p.name)
      );
      const selectedTeacher = teachers.find((t) => t.id === values.teacher);

      const updatedActivity = {
        subgroup: values.subgroup, // Now it will be an array of subgroups
        activity_id: initialData.activity_id,
        session_id: initialData.session_id,
        day: {
          _id: selectedDay?._id,
          name: selectedDay?.name,
          long_name: selectedDay?.long_name,
        },
        period: selectedPeriods.map((p) => ({
          _id: p?._id,
          name: p?.name,
          long_name: p?.long_name,
          is_interval: p?.is_interval,
        })),
        room: {
          _id: selectedRoom?._id,
          name: selectedRoom?.name,
          long_name: selectedRoom?.long_name,
          code: selectedRoom?.code,
          capacity: selectedRoom?.capacity,
        },
        teacher: selectedTeacher?.id,
        duration: values.duration,
        subject: values.subject,
      };

      onSubmit(updatedActivity); // Pass the updated activity to the parent
    } catch (error) {
      console.error("Error updating timetable:", error);
      message.error("Failed to update timetable");
    } finally {
      setLoading(false);
    }
  };

  // Sort periods from P1 to P9
  const sortedPeriods = periods
    ? [...periods].sort((a, b) => {
        const aNum = parseInt(a.name.replace("P", ""));
        const bNum = parseInt(b.name.replace("P", ""));
        return aNum - bNum;
      })
    : [];

  return (
    <Modal
      title="Edit Timetable Entry"
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="subgroup"
          label="Subgroups"
          rules={[{ required: true }]}
        >
          <Select
            mode="multiple"
            placeholder="Select subgroups"
            disabled
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {[
              "SEM101",
              "SEM102",
              "SEM201",
              "SEM202",
              "SEM301",
              "SEM302",
              "SEM401",
              "SEM402",
            ].map((sg) => (
              <Select.Option key={sg} value={sg}>
                {sg}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
          <Select
            disabled
            showSearch
            optionFilterProp="children"
            onChange={handleSubjectChange}
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {subjects?.map((subject) => (
              <Select.Option key={subject.code} value={subject.code}>
                {subject.long_name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="teacher" label="Teacher" rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {filteredTeachers.map((teacher) => (
              <Select.Option key={teacher.id} value={teacher.id}>
                {`${teacher.first_name} ${teacher.last_name}${
                  teacher.position ? ` - ${teacher.position}` : ""
                }`}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="day" label="Day" rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="children"
            onChange={handleDayChange}
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {days?.map((day) => (
              <Select.Option key={day.name} value={day.name}>
                {day.long_name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="duration"
          label="Duration (hours)"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} max={6} onChange={handleDurationChange} />
        </Form.Item>

        <Form.Item
          name="period"
          label="Periods"
          rules={[
            { required: true, message: "Please select periods" },
            { validator: validatePeriods },
          ]}
        >
          <Select
            mode="multiple"
            placeholder="Select time periods"
            showSearch
            onChange={handlePeriodChange}
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {sortedPeriods.map((period) => (
              <Select.Option key={period.name} value={period.name}>
                {period.long_name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="room"
          label={<span>Room {isLoadingSpaces && <Spin size="small" />}</span>}
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            loading={isLoadingSpaces}
            placeholder={
              isLoadingSpaces ? "Loading available rooms..." : "Select a room"
            }
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {availableSpaces.map((room) => (
              <Select.Option key={room.name} value={room.name}>
                {`${room.long_name} (${room.code}) - Capacity: ${room.capacity}`}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditTimetableModal;
