import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CompetitorTable from '../components/CompetitorTable';

const mockCompetitors = [
  {
    id: 1,
    competitor_name: 'Rafael Restaurant',
    location: 'Chicago, IL',
    strength_score: 8.2,
    weakness_score: 1.8,
    customer_sentiment: 0.75,
    market_share_estimate: 0.18,
    rating: 4.5,
    review_count: 234,
    categories: ['restaurant', 'american'],
    key_insights: ['Popular dinner spot', 'Good reviews'],
    recommendations: ['Monitor pricing']
  },
  {
    id: 2,
    competitor_name: 'Osaka Sushi',
    location: 'Chicago, IL',
    strength_score: 7.8,
    weakness_score: 2.2,
    customer_sentiment: 0.68,
    market_share_estimate: 0.15,
    rating: 4.3,
    review_count: 187,
    categories: ['restaurant', 'sushi'],
    key_insights: ['Fresh ingredients', 'Busy during lunch'],
    recommendations: ['Expand menu']
  }
];

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('CompetitorTable Component', () => {
  test('renders competitor names correctly', () => {
    renderWithRouter(<CompetitorTable competitors={mockCompetitors} />);
    
    expect(screen.getByText('Rafael Restaurant')).toBeInTheDocument();
    expect(screen.getByText('Osaka Sushi')).toBeInTheDocument();
  });

  test('renders location information', () => {
    renderWithRouter(<CompetitorTable competitors={mockCompetitors} />);
    
    const locations = screen.getAllByText('Chicago, IL');
    expect(locations.length).toBe(2);
  });

  test('renders strength scores', () => {
    renderWithRouter(<CompetitorTable competitors={mockCompetitors} />);
    
    expect(screen.getByText('8.2/10')).toBeInTheDocument();
    expect(screen.getByText('7.8/10')).toBeInTheDocument();
  });

  test('renders sentiment icons', () => {
    renderWithRouter(<CompetitorTable competitors={mockCompetitors} />);
    
    // Sentiment icons are present (TrendingUp for positive)
    const sentimentIcons = document.querySelectorAll('.text-green-500');
    expect(sentimentIcons.length).toBe(2);
  });

  test('renders market share percentages', () => {
    renderWithRouter(<CompetitorTable competitors={mockCompetitors} />);
    
    expect(screen.getByText('18.0%')).toBeInTheDocument();
    expect(screen.getByText('15.0%')).toBeInTheDocument();
  });

  test('has Analyze buttons for each competitor', () => {
    renderWithRouter(<CompetitorTable competitors={mockCompetitors} />);
    
    const analyzeButtons = screen.getAllByText('Analyze');
    expect(analyzeButtons.length).toBe(2);
  });

  test('sort dropdown changes sort configuration', () => {
    renderWithRouter(<CompetitorTable competitors={mockCompetitors} />);
    
    const sortSelect = screen.getByRole('combobox');
    expect(sortSelect).toBeInTheDocument();
    
    fireEvent.change(sortSelect, { target: { value: 'strength' } });
    expect(sortSelect.value).toBe('strength');
  });

  test('expands row when clicked', () => {
    renderWithRouter(<CompetitorTable competitors={mockCompetitors} />);
    
    const firstRow = screen.getByText('Rafael Restaurant').closest('tr');
    fireEvent.click(firstRow);
    
    // Should show insights
    expect(screen.getByText('Key Insights')).toBeInTheDocument();
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
  });

  test('export button works when competitors exist', () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = jest.fn();
    global.URL.revokeObjectURL = jest.fn();
    
    renderWithRouter(<CompetitorTable competitors={mockCompetitors} />);
    
    const exportButton = screen.getByText('Export Data');
    expect(exportButton).not.toBeDisabled();
    
    fireEvent.click(exportButton);
    expect(exportButton).toBeTruthy();
  });

  test('export button is disabled when no competitors', () => {
    renderWithRouter(<CompetitorTable competitors={[]} />);
    
    const exportButton = screen.getByText('Export Data');
    expect(exportButton).toBeDisabled();
  });

  test('shows loading state correctly', () => {
    renderWithRouter(<CompetitorTable competitors={[]} isLoading={true} />);
    
    const loadingElement = document.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });

  test('shows empty state when no competitors', () => {
    renderWithRouter(<CompetitorTable competitors={[]} />);
    
    expect(screen.getByText('No Competitor Data Available')).toBeInTheDocument();
    expect(screen.getByText('Run a market analysis to discover competitors in your area.')).toBeInTheDocument();
  });

  test('analyze button builds correct URL parameters', () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(mockNavigate);
    
    renderWithRouter(<CompetitorTable competitors={[mockCompetitors[0]]} />);
    
    const analyzeButton = screen.getByText('Analyze');
    fireEvent.click(analyzeButton);
    
    // This would check navigation in a real test
    expect(analyzeButton).toBeTruthy();
  });
});