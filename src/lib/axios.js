import Axios from 'axios';

const axios = Axios.create({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.ezdokani.com',
    withCredentials: true,
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
    },
    timeout: 5000,
})

export default axios

