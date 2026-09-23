"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const shared_1 = require("@collabroom/shared");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting CollabRoom database seeding...');
    const passwordHash = await bcryptjs_1.default.hash('Password123!', 10);
    // 1. Create Admin User
    const admin = await prisma.user.upsert({
        where: { email: 'admin@collabroom.io' },
        update: {},
        create: {
            email: 'admin@collabroom.io',
            passwordHash,
            fullName: 'System Administrator',
            systemRole: client_1.SystemRole.ADMIN,
            bio: 'CollabRoom Platform Administrator',
        },
    });
    // 2. Create Primary User (Tharun)
    const tharun = await prisma.user.upsert({
        where: { email: 'tharun@collabroom.io' },
        update: {},
        create: {
            email: 'tharun@collabroom.io',
            passwordHash,
            fullName: 'Tharun Kumar',
            bio: 'Lead Engineer & Workspace Architect',
            phone: '+1 555-0199',
        },
    });
    // 3. Create Additional Team Members
    const arun = await prisma.user.upsert({
        where: { email: 'arun@collabroom.io' },
        update: {},
        create: {
            email: 'arun@collabroom.io',
            passwordHash,
            fullName: 'Arun Patel',
            bio: 'Senior Backend Developer',
        },
    });
    const priya = await prisma.user.upsert({
        where: { email: 'priya@collabroom.io' },
        update: {},
        create: {
            email: 'priya@collabroom.io',
            passwordHash,
            fullName: 'Priya Sharma',
            bio: 'Machine Learning Specialist',
        },
    });
    const kumar = await prisma.user.upsert({
        where: { email: 'kumar@collabroom.io' },
        update: {},
        create: {
            email: 'kumar@collabroom.io',
            passwordHash,
            fullName: 'Kumar Verma',
            bio: 'Security & Cloud QA Analyst',
        },
    });
    console.log('✅ Users created.');
    // 4. Create "AI Research Team" Room
    const aiRoom = await prisma.room.create({
        data: {
            name: 'AI Research Team',
            description: 'Collaborative research workspace for deep learning architectures, dataset pipelines, and academic publications.',
            icon: 'Cpu',
            color: '#4F46E5',
            privacy: client_1.RoomPrivacy.PRIVATE,
            createdById: tharun.id,
            members: {
                create: [
                    {
                        userId: tharun.id,
                        role: client_1.MemberRole.OWNER,
                        permission: {
                            create: { ...shared_1.DEFAULT_ROLE_PERMISSIONS.OWNER },
                        },
                    },
                    {
                        userId: arun.id,
                        role: client_1.MemberRole.MANAGER,
                        permission: {
                            create: { ...shared_1.DEFAULT_ROLE_PERMISSIONS.MANAGER },
                        },
                    },
                    {
                        userId: priya.id,
                        role: client_1.MemberRole.EDITOR,
                        permission: {
                            create: { ...shared_1.DEFAULT_ROLE_PERMISSIONS.EDITOR },
                        },
                    },
                    {
                        userId: kumar.id,
                        role: client_1.MemberRole.VIEWER,
                        permission: {
                            create: {
                                ...shared_1.DEFAULT_ROLE_PERMISSIONS.VIEWER,
                                canDownload: false, // Customized: Kumar cannot download
                            },
                        },
                    },
                ],
            },
        },
    });
    // 5. Create Folders
    const researchFolder = await prisma.folder.create({
        data: {
            name: 'Research Papers',
            roomId: aiRoom.id,
            createdById: tharun.id,
            color: '#6366F1',
        },
    });
    const documentationFolder = await prisma.folder.create({
        data: {
            name: 'Project Documentation',
            roomId: aiRoom.id,
            createdById: tharun.id,
            color: '#10B981',
        },
    });
    // 6. Create Files
    const reportFile = await prisma.file.create({
        data: {
            name: 'Project_Architecture_Specification.pdf',
            originalName: 'Project_Architecture_Specification.pdf',
            mimeType: 'application/pdf',
            extension: 'pdf',
            sizeBytes: BigInt(4520000), // ~4.5 MB
            storageKey: `rooms/${aiRoom.id}/files/seed_project_arch.pdf`,
            roomId: aiRoom.id,
            folderId: documentationFolder.id,
            uploadedById: tharun.id,
            currentVersion: 2,
            versions: {
                create: [
                    {
                        versionNumber: 1,
                        storageKey: `rooms/${aiRoom.id}/files/seed_project_arch_v1.pdf`,
                        sizeBytes: BigInt(4100000),
                        uploadedById: tharun.id,
                        changeSummary: 'Initial architecture blueprint',
                    },
                    {
                        versionNumber: 2,
                        storageKey: `rooms/${aiRoom.id}/files/seed_project_arch.pdf`,
                        sizeBytes: BigInt(4520000),
                        uploadedById: arun.id,
                        changeSummary: 'Updated RBAC schema and microservice sequence diagrams',
                    },
                ],
            },
        },
    });
    const datasetPaper = await prisma.file.create({
        data: {
            name: 'Transformer_Attention_Benchmarking.pdf',
            originalName: 'Transformer_Attention_Benchmarking.pdf',
            mimeType: 'application/pdf',
            extension: 'pdf',
            sizeBytes: BigInt(2890000),
            storageKey: `rooms/${aiRoom.id}/files/seed_transformer_bench.pdf`,
            roomId: aiRoom.id,
            folderId: researchFolder.id,
            uploadedById: priya.id,
            currentVersion: 1,
            versions: {
                create: {
                    versionNumber: 1,
                    storageKey: `rooms/${aiRoom.id}/files/seed_transformer_bench.pdf`,
                    sizeBytes: BigInt(2890000),
                    uploadedById: priya.id,
                    changeSummary: 'Initial paper draft',
                },
            },
        },
    });
    // 7. Create Comments
    await prisma.comment.create({
        data: {
            fileId: reportFile.id,
            userId: arun.id,
            content: 'Please verify section 4 regarding S3 presigned URL expiration and key hashing.',
        },
    });
    await prisma.comment.create({
        data: {
            fileId: reportFile.id,
            userId: tharun.id,
            content: 'Updated it to 3600 seconds with token rotation. Please review again.',
        },
    });
    // 8. Create Activity Logs
    await prisma.activityLog.createMany({
        data: [
            {
                roomId: aiRoom.id,
                userId: tharun.id,
                action: 'ROOM_CREATED',
                entityType: 'ROOM',
                entityId: aiRoom.id,
                details: { name: 'AI Research Team' },
            },
            {
                roomId: aiRoom.id,
                userId: arun.id,
                action: 'FILE_UPLOADED',
                entityType: 'FILE',
                entityId: reportFile.id,
                details: { name: reportFile.name },
            },
            {
                roomId: aiRoom.id,
                userId: priya.id,
                action: 'MEMBER_JOINED',
                entityType: 'MEMBER',
                entityId: priya.id,
                details: { role: 'EDITOR' },
            },
        ],
    });
    // 9. Create Notifications
    await prisma.notification.createMany({
        data: [
            {
                userId: tharun.id,
                roomId: aiRoom.id,
                type: 'COMMENT_ADDED',
                title: 'New comment on Project_Architecture_Specification.pdf',
                message: 'Arun Patel commented on your document.',
                link: `/rooms/${aiRoom.id}`,
            },
            {
                userId: tharun.id,
                roomId: aiRoom.id,
                type: 'MEMBER_JOINED',
                title: 'Priya joined AI Research Team',
                message: 'Priya Sharma joined as an Editor.',
                link: `/rooms/${aiRoom.id}`,
            },
        ],
    });
    console.log('🎉 CollabRoom Database Seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
