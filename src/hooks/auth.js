import useSWR from 'swr';
import axios from '@/lib/axios';
import { useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export const useAuth = ({ middleware, redirectIfAuthenticated } = {}) => {
    const router = useRouter();
    const params = useParams();

    // Fetch user with SWR
    const { data: user, error, mutate } = useSWR('/api/user', async () => {
        try {
            const response = await axios.get('/api/user');
            return response.data;
        } catch (err) {
            if (err.response?.status === 409) {
                router.push('/verify-email');
            } else {
                throw err;
            }
        }
    });

    // CSRF helper
    const csrf = async () => {
        await axios.get('/sanctum/csrf-cookie');
    };

    // Generalized POST request with CSRF
    const postWithCsrf = async (url, data, setErrors, setStatus) => {
        try {
            await csrf();
            if (setErrors) setErrors([]);
            if (setStatus) setStatus(null);
            const response = await axios.post(url, data);
            return response.data;
        } catch (err) {
            if (err.response?.status === 422 && setErrors) {
                setErrors(err.response.data.errors);
            } else {
                throw err;
            }
        }
    };

    // Auth actions
    const register = async ({ setErrors, ...props }) => {
        await postWithCsrf('/register', props, setErrors);
        await mutate();
    };

    const login = async ({ setErrors, setStatus, ...props }) => {
        await postWithCsrf('/login', props, setErrors, setStatus);
        await mutate();
    };

    const forgotPassword = async ({ setErrors, setStatus, email }) => {
        await postWithCsrf('/forgot-password', { email }, setErrors, setStatus);
    };

    const resetPassword = async ({ setErrors, setStatus, ...props }) => {
        await postWithCsrf(
            '/reset-password',
            { token: params.token, ...props },
            setErrors,
            setStatus
        );
        router.push('/login?reset=' + btoa('Password reset successful'));
    };

    const resendEmailVerification = async ({ setStatus }) => {
        const data = await postWithCsrf('/email/verification-notification', {}, null, setStatus);
        if (setStatus) setStatus(data?.status);
    };

    const logout = useCallback(async () => {
        try {
            if (!error) await axios.post('/logout');
            mutate(null);
            window.location.pathname = '/login';
        } catch (err) {
            console.error('Logout failed:', err);
        }
    }, [error, mutate]);

    useEffect(() => {
        if (middleware === 'guest' && redirectIfAuthenticated && user) {
            router.push(redirectIfAuthenticated);
        }
        if (window.location.pathname === '/verify-email' && user?.email_verified_at) {
            router.push(redirectIfAuthenticated);
        }
        if (middleware === 'auth' && error) {
            logout();
        }
    }, [user, error, middleware, redirectIfAuthenticated, router, logout]);

    return {
        user,
        register,
        login,
        forgotPassword,
        resetPassword,
        resendEmailVerification,
        logout,
    };
};
