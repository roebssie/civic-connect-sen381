const CivicIssue = require('../src/infrastructure/database/models/CivicIssue');

describe('CivicIssue Model Validation', () => {
    it('Should reject an issue with a missing description', () => {
        const issue = new CivicIssue({
            category: 'Maintenance',
            location: { type: 'Point', coordinates: [28.1881, -25.7479] }
        });
        
        const error = issue.validateSync();
        expect(error.errors.description).toBeDefined();
    });

    it('Should reject an issue with a free-text/invalid category', () => {
        const issue = new CivicIssue({
            category: 'Pothole', // Not in the enum list
            description: 'Massive pothole on main road.',
            location: { type: 'Point', coordinates: [28.1881, -25.7479] }
        });
        
        const error = issue.validateSync();
        expect(error.errors.category).toBeDefined();
    });
});
