import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Paper,
    TextInput,
    Textarea,
    NumberInput,
    Select,
    Button,
    Stack,
    Group,
    Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import { listingsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function CreateListing() {
    const navigate = useNavigate();
    const { user, token, isAuthenticated } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect if not authenticated or not a host
    useEffect(() => {
        if (!isAuthenticated || user?.userType !== 'host') {
            navigate('/');
        }
    }, [isAuthenticated, user, navigate]);

    const form = useForm({
        initialValues: {
            title: '',
            description: '',
            inventoryType: 'slot' as 'slot' | 'date',
            location: '',
            localPrice: 1000,
            foreignPrice: 10,
            capacity: 10,
        },
        validate: {
            title: (value) => (value.length >= 3 ? null : 'Title must be at least 3 characters'),
            location: (value) => (value.length >= 2 ? null : 'Location is required'),
            localPrice: (value) => (value > 0 ? null : 'Price must be positive'),
            foreignPrice: (value) => (value > 0 ? null : 'Price must be positive'),
            capacity: (value) => (value >= 1 ? null : 'Capacity must be at least 1'),
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        if (!user || !token) return;

        setLoading(true);
        setError(null);

        const response = await listingsApi.create(
            {
                ...values,
                hostId: user.id,
            },
            token
        );

        if (response.success) {
            notifications.show({
                title: 'Listing Created!',
                message: 'Your listing is now live.',
                color: 'teal',
            });
            navigate('/dashboard');
        } else {
            setError(response.error || 'Failed to create listing');
        }

        setLoading(false);
    };

    return (
        <Container size="sm" py="xl">
            <Title order={2} mb="xl">
                Create New Listing
            </Title>

            <Paper withBorder shadow="md" p={30} radius="md">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack>
                        {error && (
                            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                                {error}
                            </Alert>
                        )}

                        <TextInput
                            label="Title"
                            placeholder="e.g., Whale Watching Tour in Mirissa"
                            required
                            {...form.getInputProps('title')}
                        />

                        <Textarea
                            label="Description"
                            placeholder="Describe your experience or accommodation..."
                            minRows={3}
                            {...form.getInputProps('description')}
                        />

                        <Select
                            label="Type"
                            placeholder="Select listing type"
                            required
                            data={[
                                { value: 'slot', label: '🎯 Experience / Tour (time-based)' },
                                { value: 'date', label: '🏨 Accommodation (date-based)' },
                            ]}
                            {...form.getInputProps('inventoryType')}
                        />

                        <TextInput
                            label="Location"
                            placeholder="e.g., Mirissa, Sri Lanka"
                            required
                            {...form.getInputProps('location')}
                        />

                        <Group grow>
                            <NumberInput
                                label="Local Price (LKR)"
                                placeholder="Price for locals"
                                min={1}
                                required
                                {...form.getInputProps('localPrice')}
                            />
                            <NumberInput
                                label="Foreign Price (USD)"
                                placeholder="Price for tourists"
                                min={1}
                                required
                                {...form.getInputProps('foreignPrice')}
                            />
                        </Group>

                        <NumberInput
                            label="Capacity"
                            placeholder="Max guests per slot/day"
                            min={1}
                            required
                            {...form.getInputProps('capacity')}
                        />

                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" onClick={() => navigate('/dashboard')}>
                                Cancel
                            </Button>
                            <Button type="submit" loading={loading}>
                                Create Listing
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}
