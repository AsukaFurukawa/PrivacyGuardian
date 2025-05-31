import React, { useEffect, useState } from "react";
import { Container, Card, Typography, Box, Grid, Paper, CircularProgress } from "@mui/material";
import { api } from "../api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { dummyAnalytics, dummyEvents } from "../dummyData";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const DASHBOARD_ANALYTICS = {
  total_documents: 245,
  total_recipients: 28,
  risk_score_distribution: {
    "Low (0-20%)": 12,
    "Medium (21-50%)": 8,
    "High (51-80%)": 5,
    "Critical (81-100%)": 3
  }
};

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(DASHBOARD_ANALYTICS);
  const [events, setEvents] = useState(dummyEvents);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setAnalytics(DASHBOARD_ANALYTICS);
      setEvents(dummyEvents);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  const pieData = Object.entries(analytics.risk_score_distribution).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Total Documents</Typography>
            <Typography variant="h3" color="primary">{analytics.total_documents}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Documents protected with watermarks
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Total Recipients</Typography>
            <Typography variant="h3" color="primary">{analytics.total_recipients}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Unique document recipients
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Risk Distribution</Typography>
            <Box sx={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Recent Events
        </Typography>
        {events.map((event, i) => (
          <Paper key={i} sx={{ p: 2, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                {event.event_type.replace(/_/g, ' ')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(event.timestamp).toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ mt: 1 }}>
              {Object.entries(event.event_data).map(([key, value]) => (
                <Typography key={key} variant="body2">
                  <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : value}
                </Typography>
              ))}
            </Box>
          </Paper>
        ))}
      </Box>
    </Container>
  );
} 