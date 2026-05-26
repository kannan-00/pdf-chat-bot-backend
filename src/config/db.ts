import mongoose from "mongoose"
import dns from "dns"

export const connectDB = async () => {
    try {
        // Set fallback public DNS servers to resolve MongoDB Atlas SRV records
        // Node's default resolver (c-ares) on Windows often defaults to loopback (127.0.0.1)
        // or fails to resolve querySrv records under certain ISP/VPN configurations.
        try {
            dns.setServers(["8.8.8.8", "1.1.1.1"])
        } catch (dnsErr) {
            console.warn("Warning: Could not set fallback DNS servers", dnsErr)
        }

        await mongoose.connect(process.env.MONGO_URI!)
        console.log("MongoDB Connected")
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}