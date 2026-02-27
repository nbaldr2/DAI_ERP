const fs = require('fs');
const path = require('path');
const { Document, User } = require('../models');

exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { category } = req.body;

        // Create document record in database
        const document = await Document.create({
            filename: req.file.filename,
            original_name: req.file.originalname,
            mime_type: req.file.mimetype,
            size: req.file.size,
            category: category || 'Uncategorized',
            path: `/uploads/documents/${req.file.filename}`,
            uploaded_by: req.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: document
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        // Remove file if database creation fails
        if (req.file) {
            const filePath = path.join(__dirname, '../../uploads/documents', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        res.status(500).json({ success: false, message: 'Server error uploading document' });
    }
};

exports.getDocuments = async (req, res) => {
    try {
        const { category } = req.query;
        const whereClause = {};

        if (category) {
            whereClause.category = category;
        }

        const documents = await Document.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'uploader',
                    attributes: ['id', 'name', 'username']
                }
            ],
            order: [['uploaded_at', 'DESC']]
        });

        res.json({
            success: true,
            data: documents
        });
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ success: false, message: 'Server error fetching documents' });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;

        const document = await Document.findByPk(id);
        if (!document) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        // Delete file from filesystem
        const filePath = path.join(__dirname, '../../', document.path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete record from database
        await document.destroy();

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ success: false, message: 'Server error deleting document' });
    }
};
