import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.GradientPaint;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.GridLayout;
import java.awt.Image;
import java.awt.RenderingHints;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import javax.swing.BorderFactory;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.ImageIcon;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.border.EmptyBorder;

public class Main extends JFrame {
    private static final String LOGO_PATH = "images/unilia-logo.png";
    private static final Color UNILIA_DARK = new Color(0x12, 0x3B, 0x73);
    private static final Color UNILIA_BLUE = new Color(0x28, 0x78, 0xC7);
    private static final Color UNILIA_LIGHT = new Color(0xEA, 0xF3, 0xFC);
    private static final Color PAGE_BACKGROUND = new Color(0xF5, 0xF8, 0xFC);
    private static final Color TEXT_DARK = new Color(0x26, 0x36, 0x4A);
    private static final Color TEXT_MUTED = new Color(0x6B, 0x7A, 0x90);
    private static final Color BORDER_COLOR = new Color(0xDC, 0xE7, 0xF2);

    private final JTextField questionInput = new JTextField();
    private final JLabel responseLabel = new JLabel(" ");
    private JScrollPane pageScroll;

    public Main() {
        super("UNILIA AI Student Assistant");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setMinimumSize(new Dimension(760, 700));
        setSize(1180, 900);
        setLocationRelativeTo(null);

        JPanel page = new JPanel(new BorderLayout());
        page.setBackground(PAGE_BACKGROUND);
        page.add(createNavigation(), BorderLayout.NORTH);

        JPanel sections = new JPanel();
        sections.setOpaque(false);
        sections.setBorder(new EmptyBorder(30, 5, 30, 5));
        sections.setLayout(new BoxLayout(sections, BoxLayout.Y_AXIS));
        sections.add(createHero());
        sections.add(Box.createVerticalStrut(30));
        sections.add(createQuestionsSection());
        sections.add(Box.createVerticalStrut(24));
        sections.add(createAboutSection());
        sections.add(Box.createVerticalStrut(24));
        sections.add(createFooter());

        pageScroll = new JScrollPane(sections);
        pageScroll.setBorder(null);
        pageScroll.getViewport().setBackground(PAGE_BACKGROUND);
        pageScroll.getVerticalScrollBar().setUnitIncrement(18);
        page.add(pageScroll, BorderLayout.CENTER);

        setContentPane(page);
    }

    private JPanel createNavigation() {
        JPanel navigation = new JPanel(new BorderLayout(24, 0));
        navigation.setBackground(Color.WHITE);
        navigation.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createMatteBorder(0, 0, 1, 0, BORDER_COLOR),
                new EmptyBorder(14, 34, 14, 34)));

        JPanel brand = new JPanel(new FlowLayout(FlowLayout.LEFT, 12, 0));
        brand.setOpaque(false);
        ImageIcon originalLogo = new ImageIcon(LOGO_PATH);
        if (originalLogo.getIconWidth() <= 0) {
            throw new IllegalStateException("Could not load the UNILIA logo image: " + LOGO_PATH);
        }
        Image scaledLogo = originalLogo.getImage().getScaledInstance(84, 56, Image.SCALE_SMOOTH);
        JLabel logo = new JLabel(new ImageIcon(scaledLogo));
        logo.setPreferredSize(new Dimension(84, 56));

        JPanel brandText = new JPanel();
        brandText.setOpaque(false);
        brandText.setLayout(new BoxLayout(brandText, BoxLayout.Y_AXIS));
        brandText.add(styledLabel("UNILIA", 18, Font.BOLD, UNILIA_DARK));
        brandText.add(styledLabel("AI Student Assistant", 12, Font.PLAIN, TEXT_MUTED));
        brand.add(logo);
        brand.add(brandText);
        navigation.add(brand, BorderLayout.WEST);

        JPanel links = new JPanel(new GridLayout(1, 4, 6, 0));
        links.setOpaque(false);
        links.add(createNavButton("Home", true));
        links.add(createNavButton("Chat with AI", false));
        links.add(createNavButton("My Conversations", false));
        links.add(createNavButton("Help Centre", false));
        navigation.add(links, BorderLayout.CENTER);

        JPanel actions = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        actions.setOpaque(false);
        actions.add(createButton("Notifications", Color.WHITE, UNILIA_DARK));
        actions.add(createButton("Student  v", UNILIA_LIGHT, UNILIA_DARK));
        navigation.add(actions, BorderLayout.EAST);
        return navigation;
    }

    private JButton createNavButton(String text, boolean active) {
        JButton button = createButton(text, active ? UNILIA_LIGHT : Color.WHITE,
                active ? UNILIA_BLUE : UNILIA_DARK);
        button.setFont(new Font("Arial", Font.PLAIN, 13));
        return button;
    }

    private JPanel createHero() {
        RoundedPanel hero = new RoundedPanel(25, UNILIA_DARK, UNILIA_BLUE);
        hero.setLayout(new GridLayout(1, 2, 28, 0));
        hero.setBorder(new EmptyBorder(38, 40, 38, 40));
        hero.setAlignmentX(Component.CENTER_ALIGNMENT);
        hero.setMaximumSize(new Dimension(1100, 430));
        hero.setPreferredSize(new Dimension(1100, 390));

        JPanel heroContent = new JPanel();
        heroContent.setOpaque(false);
        heroContent.setLayout(new BoxLayout(heroContent, BoxLayout.Y_AXIS));

        JLabel welcome = styledLabel("UNIVERSITY OF LIVINGSTONIA", 12, Font.BOLD, UNILIA_LIGHT);
        heroContent.add(welcome);
        heroContent.add(Box.createVerticalStrut(14));

        JLabel title = styledLabel("<html>Welcome to your<br>AI Student Assistant</html>",
                34, Font.BOLD, Color.WHITE);
        heroContent.add(title);
        heroContent.add(Box.createVerticalStrut(12));
        heroContent.add(styledLabel(
                "<html>Your digital university assistant. Ask questions and get guidance<br>"
                        + "about academic programmes, admissions, fees and other<br>"
                        + "university information.</html>",
                15, Font.PLAIN, UNILIA_LIGHT));
        heroContent.add(Box.createVerticalStrut(18));

        JPanel heroActions = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        heroActions.setOpaque(false);
        JButton askAssistant = createButton("Ask UNILIA AI", Color.WHITE, UNILIA_DARK);
        askAssistant.addActionListener(event -> questionInput.requestFocusInWindow());
        JButton explore = createButton("Explore Programmes", UNILIA_LIGHT, UNILIA_DARK);
        explore.addActionListener(event -> scrollToQuestions());
        JButton viewMore = createButton("View More", new Color(255, 255, 255, 35), Color.WHITE);
        viewMore.setBorder(BorderFactory.createLineBorder(new Color(220, 235, 250), 1, true));
        viewMore.addActionListener(event -> scrollToAbout());
        heroActions.add(askAssistant);
        heroActions.add(explore);
        heroActions.add(viewMore);
        heroContent.add(heroActions);
        heroContent.add(Box.createVerticalStrut(14));

        JPanel search = new JPanel(new BorderLayout(8, 0));
        search.setOpaque(false);
        questionInput.setFont(new Font("Arial", Font.PLAIN, 14));
        questionInput.setForeground(TEXT_DARK);
        questionInput.setBorder(new EmptyBorder(12, 14, 12, 14));
        questionInput.putClientProperty("JTextField.placeholderText", "Ask anything about UNILIA...");
        search.add(questionInput, BorderLayout.CENTER);
        JButton askButton = createButton("Ask AI", UNILIA_BLUE, Color.WHITE);
        askButton.addActionListener(event -> submitQuestion());
        search.add(askButton, BorderLayout.EAST);
        heroContent.add(search);
        heroContent.add(Box.createVerticalStrut(7));
        heroContent.add(styledLabel("Enter your question to begin a conversation.", 12,
                Font.PLAIN, UNILIA_LIGHT));

        RoundedPanel assistantCard = new RoundedPanel(20, new Color(255, 255, 255, 34));
        assistantCard.setLayout(new BoxLayout(assistantCard, BoxLayout.Y_AXIS));
        assistantCard.setBorder(new EmptyBorder(30, 26, 30, 26));
        assistantCard.add(Box.createVerticalGlue());
        JLabel aiIcon = styledLabel("AI", 32, Font.BOLD, UNILIA_DARK);
        aiIcon.setAlignmentX(Component.CENTER_ALIGNMENT);
        RoundedPanel iconBackground = new RoundedPanel(50, Color.WHITE);
        iconBackground.setLayout(new BorderLayout());
        iconBackground.setPreferredSize(new Dimension(76, 76));
        iconBackground.setMaximumSize(new Dimension(76, 76));
        iconBackground.add(aiIcon, BorderLayout.CENTER);
        iconBackground.setAlignmentX(Component.CENTER_ALIGNMENT);
        assistantCard.add(iconBackground);
        assistantCard.add(Box.createVerticalStrut(18));
        JLabel assistantTitle = styledLabel("How can I help you?", 21, Font.BOLD, Color.WHITE);
        assistantTitle.setAlignmentX(Component.CENTER_ALIGNMENT);
        assistantCard.add(assistantTitle);
        JLabel assistantDescription = styledLabel(
                "<html><div style='text-align:center'>Get assistance with your<br>"
                        + "university-related questions.</div></html>",
                14, Font.PLAIN, UNILIA_LIGHT);
        assistantDescription.setAlignmentX(Component.CENTER_ALIGNMENT);
        assistantCard.add(Box.createVerticalStrut(8));
        assistantCard.add(assistantDescription);
        assistantCard.add(Box.createVerticalStrut(18));
        JLabel online = styledLabel("●  Assistant interface ready", 12, Font.PLAIN, UNILIA_LIGHT);
        online.setAlignmentX(Component.CENTER_ALIGNMENT);
        assistantCard.add(online);
        assistantCard.add(Box.createVerticalGlue());

        hero.add(heroContent);
        hero.add(assistantCard);
        return hero;
    }

    private JPanel createQuestionsSection() {
        JPanel section = new JPanel();
        section.setOpaque(false);
        section.setBorder(new EmptyBorder(0, 18, 0, 18));
        section.setLayout(new BoxLayout(section, BoxLayout.Y_AXIS));
        section.setAlignmentX(Component.CENTER_ALIGNMENT);
        section.setMaximumSize(new Dimension(1100, 500));

        JLabel heading = styledLabel("What would you like to know?", 26, Font.BOLD, UNILIA_DARK);
        heading.setAlignmentX(Component.CENTER_ALIGNMENT);
        section.add(heading);
        JLabel subheading = styledLabel("Choose a topic or type your own question above.",
                14, Font.PLAIN, TEXT_MUTED);
        subheading.setAlignmentX(Component.CENTER_ALIGNMENT);
        section.add(Box.createVerticalStrut(6));
        section.add(subheading);
        section.add(Box.createVerticalStrut(20));

        JPanel cards = new JPanel(new GridLayout(2, 2, 16, 16));
        cards.setOpaque(false);
        cards.add(createQuestionCard("🎓", "Academic Programmes",
                "Learn about available courses and programmes.",
                "What programmes are offered at UNILIA?"));
        cards.add(createQuestionCard("📋", "Admissions",
                "Find information about admission requirements.",
                "What are the admission requirements?"));
        cards.add(createQuestionCard("💳", "Fees and Payments",
                "Find guidance about university fees and payments.",
                "Where can I find information about university fees?"));
        cards.add(createQuestionCard("📅", "Academic Calendar",
                "Ask about important academic dates and activities.",
                "Where can I find the academic calendar?"));
        section.add(cards);

        responseLabel.setFont(new Font("Arial", Font.PLAIN, 14));
        responseLabel.setForeground(UNILIA_DARK);
        RoundedPanel response = new RoundedPanel(18, Color.WHITE);
        response.setLayout(new BorderLayout());
        response.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createMatteBorder(0, 5, 0, 0, UNILIA_BLUE),
                new EmptyBorder(14, 14, 14, 14)));
        response.add(responseLabel, BorderLayout.CENTER);
        response.setVisible(false);
        section.add(Box.createVerticalStrut(16));
        section.add(response);
        responseLabel.putClientProperty("responsePanel", response);
        return section;
    }

    private JPanel createQuestionCard(String icon, String title, String description, String question) {
        RoundedPanel card = new RoundedPanel(20, Color.WHITE);
        card.setLayout(new BoxLayout(card, BoxLayout.Y_AXIS));
        card.setBorder(new EmptyBorder(20, 22, 20, 22));
        card.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        card.setPreferredSize(new Dimension(400, 150));
        card.add(styledLabel(icon, 24, Font.PLAIN, UNILIA_DARK));
        card.add(Box.createVerticalStrut(8));
        card.add(styledLabel(title, 17, Font.BOLD, UNILIA_DARK));
        card.add(Box.createVerticalStrut(5));
        card.add(styledLabel("<html>" + description + "</html>", 13, Font.PLAIN, TEXT_MUTED));
        card.add(Box.createVerticalGlue());
        card.add(styledLabel("Ask about " + title.toLowerCase() + "  →", 12, Font.BOLD, UNILIA_BLUE));
        card.addMouseListener(new MouseAdapter() {
            @Override
            public void mouseClicked(MouseEvent event) {
                questionInput.setText(question);
                questionInput.requestFocusInWindow();
            }
        });
        return card;
    }

    private JPanel createAboutSection() {
        RoundedPanel about = new RoundedPanel(20, UNILIA_LIGHT);
        about.setLayout(new BoxLayout(about, BoxLayout.Y_AXIS));
        about.setBorder(new EmptyBorder(25, 30, 25, 30));
        about.setAlignmentX(Component.CENTER_ALIGNMENT);
        about.setMaximumSize(new Dimension(1100, 160));
        about.add(styledLabel("About UNILIA AI Assistant", 22, Font.BOLD, UNILIA_DARK));
        about.add(Box.createVerticalStrut(8));
        about.add(styledLabel(
                "<html>The UNILIA AI Student Assistant is designed to help students access "
                        + "university information through a simple question-and-answer interface.</html>",
                14, Font.PLAIN, TEXT_DARK));
        return about;
    }

    private JPanel createFooter() {
        RoundedPanel footer = new RoundedPanel(18, UNILIA_DARK);
        footer.setLayout(new BoxLayout(footer, BoxLayout.Y_AXIS));
        footer.setBorder(new EmptyBorder(18, 20, 18, 20));
        footer.setAlignmentX(Component.CENTER_ALIGNMENT);
        footer.setMaximumSize(new Dimension(1100, 100));
        JLabel copyright = styledLabel(
                "© 2026 University of Livingstonia (UNILIA). AI Student Assistant.",
                13, Font.PLAIN, Color.WHITE);
        copyright.setAlignmentX(Component.CENTER_ALIGNMENT);
        JLabel motto = styledLabel("Courage, Excellence and Confidence.", 12,
                Font.PLAIN, UNILIA_LIGHT);
        motto.setAlignmentX(Component.CENTER_ALIGNMENT);
        footer.add(copyright);
        footer.add(Box.createVerticalStrut(5));
        footer.add(motto);
        return footer;
    }

    private JLabel styledLabel(String text, int size, int style, Color color) {
        JLabel label = new JLabel(text);
        label.setFont(new Font("Arial", style, size));
        label.setForeground(color);
        return label;
    }

    private JButton createButton(String text, Color background, Color foreground) {
        JButton button = new JButton(text);
        button.setFont(new Font("Arial", Font.BOLD, 13));
        button.setForeground(foreground);
        button.setBackground(background);
        button.setFocusPainted(false);
        button.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
        button.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(background, 1, true),
                new EmptyBorder(9, 14, 9, 14)));
        button.setOpaque(true);
        return button;
    }

    private void submitQuestion() {
        String question = questionInput.getText().trim();
        if (question.isEmpty()) {
            questionInput.requestFocusInWindow();
            return;
        }
        responseLabel.setText("<html><b>Your question:</b> " + question
                + "<br>Your question has been captured by the frontend. "
                + "The AI backend will be connected during system integration.</html>");
        Component response = (Component) responseLabel.getClientProperty("responsePanel");
        response.setVisible(true);
        pageScroll.revalidate();
        pageScroll.repaint();
    }

    private void scrollToQuestions() {
        pageScroll.getVerticalScrollBar().setValue(340);
    }

    private void scrollToAbout() {
        pageScroll.getVerticalScrollBar().setValue(pageScroll.getVerticalScrollBar().getMaximum());
    }

    private static class RoundedPanel extends JPanel {
        private final int radius;
        private final Color startColor;
        private final Color endColor;

        RoundedPanel(int radius, Color color) {
            this(radius, color, null);
        }

        RoundedPanel(int radius, Color startColor, Color endColor) {
            this.radius = radius;
            this.startColor = startColor;
            this.endColor = endColor;
            setOpaque(false);
        }

        @Override
        protected void paintComponent(Graphics graphics) {
            Graphics2D g2 = (Graphics2D) graphics.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            if (endColor == null) {
                g2.setColor(startColor);
            } else {
                g2.setPaint(new GradientPaint(0, 0, startColor, getWidth(), getHeight(), endColor));
            }
            g2.fillRoundRect(0, 0, getWidth(), getHeight(), radius, radius);
            g2.dispose();
            super.paintComponent(graphics);
        }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception exception) {
                System.err.println("Could not load the system look and feel: " + exception.getMessage());
            }
            new Main().setVisible(true);
        });
    }
}
