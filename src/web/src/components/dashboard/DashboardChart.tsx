import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Cell
} from 'recharts'; // ^2.7.0
import { TaskStatus, ITask } from '../../interfaces/task.interface';
import { selectTasks, selectTasksByStatus } from '../../store/task/task.selectors';

// Styled components for layout and responsiveness
const ChartContainer = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--spacing-lg);
    padding: var(--spacing-md);
    width: 100%;
    height: 400px;

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
        height: auto;
    }
`;

const ChartCard = styled.div`
    background: var(--bg-card);
    border-radius: var(--border-radius-md);
    padding: var(--spacing-md);
    box-shadow: var(--shadow-sm);
    height: 100%;
`;

const ChartTitle = styled.h3`
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
    text-align: center;
`;

// Status color mapping for consistent visualization
const STATUS_COLORS = {
    [TaskStatus.TODO]: '#8884d8',
    [TaskStatus.IN_PROGRESS]: '#82ca9d',
    [TaskStatus.IN_REVIEW]: '#ffc658',
    [TaskStatus.COMPLETED]: '#4caf50',
    [TaskStatus.BLOCKED]: '#ff5252'
};

interface DashboardChartProps {
    days?: number;
}

const DashboardChart: React.FC<DashboardChartProps> = ({ days = 30 }) => {
    // Redux selectors for task data
    const tasks = useSelector(selectTasks);

    // Memoized calculations for chart data
    const taskDistribution = useMemo(() => calculateTaskStatusDistribution(tasks), [tasks]);
    const completionTrend = useMemo(() => calculateCompletionTrend(tasks, days), [tasks, days]);

    return (
        <ChartContainer>
            <ChartCard>
                <ChartTitle>Task Status Distribution</ChartTitle>
                {renderTaskDistributionChart(taskDistribution)}
            </ChartCard>
            <ChartCard>
                <ChartTitle>Task Completion Trend</ChartTitle>
                {renderCompletionTrendChart(completionTrend)}
            </ChartCard>
        </ChartContainer>
    );
};

// Helper function to calculate task distribution
const calculateTaskStatusDistribution = (tasks: ITask[]) => {
    const distribution = Object.values(TaskStatus).reduce((acc, status) => {
        acc[status] = tasks.filter(task => task.status === status).length;
        return acc;
    }, {} as Record<TaskStatus, number>);

    return Object.entries(distribution).map(([status, value]) => ({
        name: status.replace('_', ' '),
        value,
        color: STATUS_COLORS[status as TaskStatus]
    }));
};

// Helper function to calculate completion trend
const calculateCompletionTrend = (tasks: ITask[], days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const completedTasks = tasks.filter(task => 
        task.status === TaskStatus.COMPLETED && 
        new Date(task.updatedAt) >= startDate
    );

    const trendData = new Array(days).fill(null).map((_, index) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + index);
        const dayStr = date.toISOString().split('T')[0];

        return {
            date: dayStr,
            completed: completedTasks.filter(task => 
                task.updatedAt.toISOString().split('T')[0] === dayStr
            ).length
        };
    });

    return trendData;
};

// Render function for pie chart
const renderTaskDistributionChart = (data: Array<{ name: string; value: number; color: string }>) => (
    <ResponsiveContainer width="100%" height={300}>
        <PieChart>
            <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={true}
            >
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
            </Pie>
            <Tooltip
                formatter={(value: number) => [`${value} tasks`, 'Count']}
            />
            <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => value.replace('_', ' ')}
            />
        </PieChart>
    </ResponsiveContainer>
);

// Render function for line chart
const renderCompletionTrendChart = (data: Array<{ date: string; completed: number }>) => (
    <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString()} 
                angle={-45}
                textAnchor="end"
                height={60}
            />
            <YAxis 
                allowDecimals={false}
                label={{ value: 'Completed Tasks', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                formatter={(value: number) => [`${value} tasks`, 'Completed']}
            />
            <Legend />
            <Line
                type="monotone"
                dataKey="completed"
                stroke={STATUS_COLORS[TaskStatus.COMPLETED]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                name="Completed Tasks"
            />
        </LineChart>
    </ResponsiveContainer>
);

export default DashboardChart;